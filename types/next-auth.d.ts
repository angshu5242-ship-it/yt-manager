// Type augmentation for next-auth session to include accessToken
import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}
