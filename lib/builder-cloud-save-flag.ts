/** When true, 3D builder skips Storage/Firestore cloud saves (localStorage still works). */
export function is3DCloudSaveDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_DISABLE_3D_CLOUD_SAVE?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}
