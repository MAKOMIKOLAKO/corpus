-- Remove onboarding completion fields from User model (onboarding flow removed)
ALTER TABLE "User" DROP COLUMN "onboardingCompleted";
ALTER TABLE "User" DROP COLUMN "onboardingCompletedAt";
