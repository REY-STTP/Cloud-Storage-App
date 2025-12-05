import "dotenv/config";
import { connectDB } from "../lib/db";
import { User } from "../models/User";
import { hashPassword } from "../lib/auth";

async function main() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists:", email);
    return;
  }

  const hashed = await hashPassword(password);

  await User.create({
    name: "Super Admin",
    email,
    password: hashed,
    role: "ADMIN",
  });

  console.log("Admin created:");
  console.log("Email   :", email);
  console.log("Password:", password);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
