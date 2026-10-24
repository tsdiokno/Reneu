import { db } from './db';
import type {
  ReadingPlan,
  PlanScope,
  PlanDaysPerWeek,
  PlanTrackStyle,
} from '../types/readingPlan';
import { CLASSICAL_PRESETS } from './readingPlanEngine';

const SETTING_KEY_ACTIVE_PLAN = 'active_reading_plan_id';

function clonePlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Retrieves all saved reading plans
 */
export async function getAllReadingPlans(): Promise<ReadingPlan[]> {
  try {
    return await db.readingPlans.orderBy('createdAt').reverse().toArray();
  } catch (err) {
    console.warn('Error fetching reading plans:', err);
    return [];
  }
}

/**
 * Retrieves the currently active reading plan, initializing the default M'Cheyne preset if none exists
 */
export async function getActiveReadingPlan(): Promise<ReadingPlan | null> {
  try {
    const plans = await db.readingPlans.toArray();
    if (plans.length === 0) {
      // Auto-initialize default classical M'Cheyne plan
      const defaultPlan = await createPlanFromPreset('mcheyne', true);
      return defaultPlan;
    }

    const activeSetting = await db.settings.get(SETTING_KEY_ACTIVE_PLAN);
    if (activeSetting && activeSetting.value) {
      const match = plans.find((p) => p.id === activeSetting.value);
      if (match) return match;
    }

    // Fall back to first active plan or most recent plan
    const active = plans.find((p) => p.isActive) || plans[0];
    if (active) {
      await db.settings.put({ id: SETTING_KEY_ACTIVE_PLAN, value: active.id });
    }
    return active || null;
  } catch (err) {
    console.warn('Error fetching active reading plan:', err);
    return null;
  }
}

/**
 * Saves or updates a reading plan in Dexie
 */
export async function saveReadingPlan(plan: ReadingPlan): Promise<void> {
  const plain = clonePlain(plan);
  await db.readingPlans.put(plain);
  if (plain.isActive) {
    await db.settings.put({ id: SETTING_KEY_ACTIVE_PLAN, value: plain.id });
  }
}

/**
 * Sets a specific plan as the active one
 */
export async function setActiveReadingPlan(planId: string): Promise<void> {
  const plans = await db.readingPlans.toArray();
  for (const p of plans) {
    const isActive = p.id === planId;
    if (p.isActive !== isActive) {
      p.isActive = isActive;
      await db.readingPlans.put(clonePlain(p));
    }
  }
  await db.settings.put({ id: SETTING_KEY_ACTIVE_PLAN, value: planId });
}

/**
 * Deletes a reading plan
 */
export async function deleteReadingPlan(planId: string): Promise<void> {
  await db.readingPlans.delete(planId);
  const remaining = await db.readingPlans.toArray();
  if (remaining.length > 0) {
    await setActiveReadingPlan(remaining[0].id);
  } else {
    // If all plans were deleted, re-create the default preset
    await createPlanFromPreset('mcheyne', true);
  }
}

/**
 * Creates a plan from a classical preset definition
 */
export async function createPlanFromPreset(
  presetKey: NonNullable<ReadingPlan['presetKey']>,
  setAsActive: boolean = true
): Promise<ReadingPlan> {
  const def = CLASSICAL_PRESETS.find((p) => p.key === presetKey) || CLASSICAL_PRESETS[0];
  const now = Date.now();
  const id = `plan-${presetKey}-${now}-${Math.random().toString(36).substring(2, 7)}`;

  const newPlan: ReadingPlan = {
    id,
    title: def.title,
    description: def.description,
    isPreset: true,
    presetKey: def.key,
    scope: def.scope,
    durationDays: def.durationDays,
    daysPerWeek: def.daysPerWeek,
    trackStyle: def.trackStyle,
    startDate: now,
    createdAt: now,
    updatedAt: now,
    isActive: setAsActive,
    completedDays: [],
    completedPortions: {},
  };

  await saveReadingPlan(newPlan);
  if (setAsActive) {
    await setActiveReadingPlan(id);
  }
  return newPlan;
}

/**
 * Creates a custom configured reading plan
 */
export async function createCustomPlan(params: {
  title: string;
  description?: string;
  scope: PlanScope;
  durationDays: number;
  daysPerWeek: PlanDaysPerWeek;
  trackStyle: PlanTrackStyle;
  customBookIds?: number[];
  setAsActive?: boolean;
}): Promise<ReadingPlan> {
  const now = Date.now();
  const id = `plan-custom-${now}-${Math.random().toString(36).substring(2, 7)}`;

  const newPlan: ReadingPlan = {
    id,
    title: params.title.trim() || 'Custom Reading Plan',
    description: params.description?.trim() || 'Personal Bible reading schedule.',
    isPreset: false,
    scope: params.scope,
    durationDays: params.durationDays,
    daysPerWeek: params.daysPerWeek,
    trackStyle: params.trackStyle,
    customBookIds: params.customBookIds,
    startDate: now,
    createdAt: now,
    updatedAt: now,
    isActive: params.setAsActive ?? true,
    completedDays: [],
    completedPortions: {},
  };

  await saveReadingPlan(newPlan);
  if (params.setAsActive ?? true) {
    await setActiveReadingPlan(id);
  }
  return newPlan;
}

/**
 * Toggles a day's completed state
 */
export async function toggleDayCompleted(planId: string, dayNumber: number): Promise<ReadingPlan | null> {
  const plan = await db.readingPlans.get(planId);
  if (!plan) return null;

  const completedDaysSet = new Set(plan.completedDays || []);
  const willBeCompleted = !completedDaysSet.has(dayNumber);

  if (willBeCompleted) {
    completedDaysSet.add(dayNumber);
  } else {
    completedDaysSet.delete(dayNumber);
  }

  plan.completedDays = Array.from(completedDaysSet).sort((a, b) => a - b);
  plan.updatedAt = Date.now();

  await saveReadingPlan(plan);
  return plan;
}

/**
 * Toggles an individual portion's completed state, auto-completing the day if all portions are marked
 */
export async function togglePortionCompleted(
  planId: string,
  portionKey: string,
  dayNumber: number,
  allDayPortionKeys: string[]
): Promise<ReadingPlan | null> {
  const plan = await db.readingPlans.get(planId);
  if (!plan) return null;

  const completedPortions = { ...(plan.completedPortions || {}) };
  const currentVal = Boolean(completedPortions[portionKey]);
  if (currentVal) {
    delete completedPortions[portionKey];
  } else {
    completedPortions[portionKey] = true;
  }
  plan.completedPortions = completedPortions;

  // Check if all portions for this day are finished
  const allFinished = allDayPortionKeys.length > 0 && allDayPortionKeys.every((k) => completedPortions[k]);
  const completedDaysSet = new Set(plan.completedDays || []);

  if (allFinished) {
    completedDaysSet.add(dayNumber);
  } else {
    completedDaysSet.delete(dayNumber);
  }

  plan.completedDays = Array.from(completedDaysSet).sort((a, b) => a - b);
  plan.updatedAt = Date.now();

  await saveReadingPlan(plan);
  return plan;
}

/**
 * Sets a day's completed state explicitly and marks its assigned portions
 */
export async function setDayCompletionState(
  planId: string,
  dayNumber: number,
  isCompleted: boolean,
  allDayPortionKeys?: string[]
): Promise<ReadingPlan | null> {
  const plan = await db.readingPlans.get(planId);
  if (!plan) return null;

  const completedDaysSet = new Set(plan.completedDays || []);
  const completedPortions = { ...(plan.completedPortions || {}) };

  if (isCompleted) {
    completedDaysSet.add(dayNumber);
    if (allDayPortionKeys) {
      for (const k of allDayPortionKeys) {
        completedPortions[k] = true;
      }
    }
  } else {
    completedDaysSet.delete(dayNumber);
    if (allDayPortionKeys) {
      for (const k of allDayPortionKeys) {
        delete completedPortions[k];
      }
    }
  }

  plan.completedDays = Array.from(completedDaysSet).sort((a, b) => a - b);
  plan.completedPortions = completedPortions;
  plan.updatedAt = Date.now();

  await saveReadingPlan(plan);
  return plan;
}

/**
 * Resets all progress for a given reading plan
 */
export async function resetPlanProgress(planId: string): Promise<ReadingPlan | null> {
  const plan = await db.readingPlans.get(planId);
  if (!plan) return null;

  plan.completedDays = [];
  plan.completedPortions = {};
  plan.startDate = Date.now();
  plan.updatedAt = Date.now();

  await saveReadingPlan(plan);
  return plan;
}
