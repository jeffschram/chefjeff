import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    // Return hardcoded user for development
    return {
      _id: "k17f8f7j9j8h7g6f5d4s3a2q1w0e9r8t",
      name: "Jeff Schram",
      email: "schramindustries@gmail.com",
      username: "jeffschram"
    };
  },
});
