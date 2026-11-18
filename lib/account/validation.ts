import { z } from "zod";

export const profileSchema = z.object({ displayName: z.string().trim().min(1).max(50), phone: z.string().trim().regex(/^[0-9+() -]{8,20}$/, "연락처를 확인해 주세요.") });
export const addressSchema = z.object({
  id: z.uuid().optional(), label: z.string().trim().min(1).max(30),
  recipientName: z.string().trim().min(1).max(50), phone: profileSchema.shape.phone,
  postalCode: z.string().regex(/^\d{5}$/, "우편번호는 5자리로 입력해 주세요."),
  address1: z.string().trim().min(3).max(200), address2: z.string().trim().max(200),
  deliveryNote: z.string().trim().max(200),
});
export const orderSchema = z.object({ bookId: z.uuid(), addressId: z.uuid() });
const transform = z.object({ scale: z.number().finite().positive().max(20), x: z.number().finite(), y: z.number().finite() });
export const draftSchema = z.object({
  writingMode: z.enum(["direct", "interview"]).optional(),
  directLetter: z.object({to:z.string().max(200),body:z.string().max(10000),from:z.string().max(200),letterId:z.string().optional()}).optional(),
  interviewProgress: z.object({
    paper:z.union([z.literal(1),z.literal(2),z.literal(3)]).optional(),
    introExamples:z.array(z.string().max(300)).max(2).optional(),
    question:z.string().max(200), relationship:z.string().max(200),
    turns:z.array(z.object({question:z.string().max(300),answer:z.string().max(1500)})).max(8),
    choices:z.array(z.string().max(300)).max(3), previousQuestions:z.array(z.string().max(300)).max(24),
    current:z.string().max(300), answer:z.string().max(1500), from:z.string().max(100), polished:z.string().max(16000).nullable(),
    stage:z.enum(["interview","review","from","options","paper","final","relationship"]),
    savedSteps:z.record(z.string(),z.object({question:z.string().max(300),answer:z.string().max(1500),choices:z.array(z.string().max(300)).max(3)})),
  }).optional(),
  version: z.literal(1), status: z.enum(["draft", "submitted"]),
  step: z.enum(["order", "photos", "interview", "letters", "preview"]), interviewIndex: z.number().int().nonnegative(),
  coverTitle: z.string().max(100).optional(), occasion: z.literal("lover-birthday"), recipientName: z.string().max(100), anniversaryDate: z.string().max(10),
  lateAccepted: z.boolean(), bookSize: z.enum(["4x5", "8x8"]), design: z.enum(["minimal", "magazine"]).optional(),
  answers: z.record(z.string(), z.string().max(10000)), photoByQuestion: z.record(z.string(), z.string()),
  coverPhotoId: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(), submittedAt: z.string().optional(),
  bookPhotos: z.array(z.object({ id: z.string(), photoId: z.string() })).max(19).optional(),
  letters: z.array(z.object({ id: z.string(), question: z.string().max(2000), answer: z.string().max(10000), pageId: z.string().nullable(), paper:z.union([z.literal(1),z.literal(2),z.literal(3)]).optional() })).max(500).optional(),
  photoLayout: z.record(z.string(), z.enum(["landscape", "portrait", "portrait2", "square"])).optional(),
  photoTransforms: z.record(z.string(), transform).optional(), coverPhotoTransform: transform.optional(),
  photoFrames: z.record(z.string(), transform).optional(), coverPhotoFrame: transform.optional(),
  editorStage: z.enum(["photos", "letters"]).optional(),
  coverType: z.enum(["photo", "text"]).optional(),
  letterPaper: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export function safeReturnPath(value: string | null) {
  return value && /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(value) ? value : "/account";
}
