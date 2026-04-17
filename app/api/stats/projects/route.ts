import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const revalidate = 600; // Cache for 10 minutes

export async function GET() {
  try {
    const db = getAdminDb();
    
    // We add a base count since some older projects weren't tracked in this exact collection
    const BASE_COUNT = 1845; 

    // Aggregate query to count all 3d projects across all users
    const snapshot = await db.collectionGroup('3dProjects').count().get();
    const count = snapshot.data().count;

    return NextResponse.json({
      success: true,
      count: count + BASE_COUNT
    });
  } catch (err: any) {
    console.error('Failed to fetch projects count stats:', err);
    // Return base count on fallback
    return NextResponse.json({ success: false, count: 1845 });
  }
}
