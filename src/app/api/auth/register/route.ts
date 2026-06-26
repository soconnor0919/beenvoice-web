import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/env";
import { db } from "~/server/db";
import { accounts, users } from "~/server/db/schema";

const registerSchema = z
  .object({
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    name: z.string().trim().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .superRefine((data, ctx) => {
    const hasSplitName =
      Boolean(data.firstName?.length) && Boolean(data.lastName?.length);
    const hasFullName = Boolean(data.name?.length);

    if (!hasSplitName && !hasFullName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First and last name are required",
        path: ["firstName"],
      });
    }
  })
  .transform((data) => {
    if (data.name?.length) {
      const parts = data.name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ") || firstName;
      return {
        firstName,
        lastName,
        email: data.email,
        password: data.password,
      };
    }

    return {
      firstName: data.firstName!.trim(),
      lastName: data.lastName!.trim(),
      email: data.email,
      password: data.password,
    };
  });

const fieldLabels: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  name: "Name",
  email: "Email address",
  password: "Password",
};

function formatRegisterError(error: z.ZodError): string {
  const issue = error.issues[0] ?? error.errors[0];
  if (!issue) return "Please check the registration form";

  const field = issue.path[0];
  const label =
    typeof field === "string" ? (fieldLabels[field] ?? field) : "Field";

  if (
    issue.code === "invalid_type" &&
    "received" in issue &&
    issue.received === "undefined"
  ) {
    return `${label} is required`;
  }

  if (issue.message && issue.message !== "Required") {
    return issue.message;
  }

  return `${label} is required`;
}

export async function POST(request: NextRequest) {
  try {
    if (env.DISABLE_SIGNUPS === true) {
      return NextResponse.json(
        { error: "New account registration is currently disabled" },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Please try again." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Registration details are required" },
        { status: 400 },
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatRegisterError(parsed.error) },
        { status: 400 },
      );
    }

    const { firstName, lastName, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: `${firstName} ${lastName}`,
          email: normalizedEmail,
          password: hashedPassword,
        })
        .returning({ id: users.id });

      if (!user) {
        throw new Error("Failed to create user");
      }

      await tx.insert(accounts).values({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
      });
    });

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
