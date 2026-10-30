import { z } from "zod";
import { TARGET_IDS } from "./targets";
export const Params = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  theme: z.enum(["school", "animals", "home", "outdoors", "space"]),
  targets: z.array(z.enum(TARGET_IDS)).min(1).max(3).refine((ids) => new Set(ids).size === ids.length, "Choose distinct targets"),
  demoRefusal: z.literal(true).optional(),
}).strict();
