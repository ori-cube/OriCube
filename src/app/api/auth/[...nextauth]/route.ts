import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createUser, getUserFromEmail } from "@/actions/user";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const name = user.name as string;
      const email = user.email as string;
      const avatarUrl = user.image as string;
      const userInDb = await getUserFromEmail(email);
      if (!userInDb) {
        await createUser(name, email, avatarUrl);
      }
      return true;
    },
  },
});
export { handler as GET, handler as POST };
