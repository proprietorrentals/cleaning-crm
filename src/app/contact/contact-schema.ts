import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160, "Name is too long"),
  company: z.string().trim().min(1, "Company is required").max(200, "Company is too long"),
  email: z.string().trim().email("Invalid email address").max(320, "Email is too long"),
  phone: z.string().trim().max(80, "Phone is too long").optional().or(z.literal("")),
  employeeCount: z.string().trim().min(1, "Employee count is required").max(80, "Employee count is too long"),
  businessType: z.string().trim().min(1, "Business type is required").max(120, "Business type is too long"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(3000, "Message is too long"),
  leadSource: z.enum(["website_contact", "demo_request", "founding_partner", "free_trial"]).optional(),
  website: z.string().optional(),
  language: z.enum(["en", "es"]).optional(),
});

export type ContactSchemaInput = z.infer<typeof contactSchema>;
