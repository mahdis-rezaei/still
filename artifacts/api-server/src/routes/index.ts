import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reflectionsRouter from "./reflections";
import entriesRouter from "./entries";
import memoriesRouter from "./memories";
import importsRouter from "./imports";
import stillRouter from "./still";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
// Reflections before entries so /entries/:id/reflections matches here first
// (single auth) rather than falling through the entries router.
router.use(reflectionsRouter);
router.use(entriesRouter);
router.use(memoriesRouter);
router.use(importsRouter);
router.use(stillRouter);

export default router;
