import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import entriesRouter from "./entries";
import stillRouter from "./still";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(entriesRouter);
router.use(stillRouter);

export default router;
