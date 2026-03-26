import { prisma } from '@/lib/prismaWithRetry';

export async function trackAnalyticsEvent(
  event: string,
  userId?: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event,
        userId,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error('Failed to track analytics event:', error);
    // Don't throw error to avoid breaking main functionality
  }
}

// Specific event trackers for convenience
export const analytics = {
  userSignedUp: (userId: string) => 
    trackAnalyticsEvent('USER_SIGNED_UP', userId),
    
  usernameSet: (userId: string) => 
    trackAnalyticsEvent('USERNAME_SET', userId),
    
  emailVerified: (userId: string) => 
    trackAnalyticsEvent('EMAIL_VERIFIED', userId),
    
  entrySaved: (userId: string, entryId: string, entryType?: string) => 
    trackAnalyticsEvent('ENTRY_SAVED', userId, { entryId, entryType }),
    
  readingStatusUpdated: (userId: string, entryId: string, status: string) => 
    trackAnalyticsEvent('READING_STATUS_UPDATED', userId, { entryId, readingStatus: status }),
    
  collectionCreated: (userId: string, collectionId: string) => 
    trackAnalyticsEvent('COLLECTION_CREATED', userId, { collectionId }),
    
  collectionShared: (userId: string, collectionId: string) => 
    trackAnalyticsEvent('COLLECTION_SHARED', userId, { collectionId }),
    
  collectionShareAccepted: (userId: string, collectionId: string) => 
    trackAnalyticsEvent('COLLECTION_SHARE_ACCEPTED', userId, { collectionId }),
    
  feedCardViewed: (userId?: string, entryId?: string) => 
    trackAnalyticsEvent('FEED_CARD_VIEWED', userId, { entryId }),
    
  addToLibraryClicked: (userId?: string, entryId?: string) => 
    trackAnalyticsEvent('ADD_TO_LIBRARY_CLICKED', userId, { entryId }),
};
