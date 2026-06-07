import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import privacyRouter from "./privacy";
import reflectionsRouter from "./reflections";
import attachmentsRouter from "./attachments";
import entriesRouter from "./entries";
import memoriesRouter from "./memories";
import continuityRouter from "./continuity";
import lettersRouter from "./letters";
import shelfRouter from "./shelf";
import capsulesRouter from "./capsules";
import collectionsRouter from "./collections";
import preferencesRouter from "./preferences";
import resurfaceMutesRouter from "./resurface-mutes";
import importsRouter from "./imports";
import notificationsRouter from "./notifications";
import cronRouter from "./cron";
import billingRouter from "./billing";
import shopRouter from "./shop";
import stillRouter from "./still";
import { rateLimit, ipKey, isLoopback } from "../lib/rate-limit";

const router: IRouter = Router();

// Guard the raw engine endpoints from external abuse (they're costly LLM calls).
// The internal call from /memories/run comes from loopback and is exempt, so
// real users (who go through the rate-limited /memories/run) are unaffected.
// This lives here, not in the engine file, so the engine stays untouched.
const engineGuard = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  keyOf: ipKey,
  skip: isLoopback,
  message: "Too many requests to the engine — please slow down.",
});

router.use(healthRouter);
router.use(authRouter);
router.use(privacyRouter);
// Reflections + attachments before entries so /entries/:id/reflections and
// /entries/:id/attachments match here first rather than falling through.
router.use(reflectionsRouter);
router.use(attachmentsRouter);
router.use(entriesRouter);
router.use(memoriesRouter);
router.use(continuityRouter);
router.use(lettersRouter);
router.use(shelfRouter);
router.use(capsulesRouter);
router.use(collectionsRouter);
router.use(preferencesRouter);
router.use(resurfaceMutesRouter);
router.use(importsRouter);
router.use(notificationsRouter);
router.use(cronRouter);
router.use(billingRouter);
router.use(shopRouter);
router.use("/still", engineGuard);
router.use(stillRouter);

export default router;
