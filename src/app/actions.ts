'use server';

import { getQuickTip } from "@/ai/flows/quick-tip-flow";

export async function getQuickTipAction() {
    return await getQuickTip();
}
