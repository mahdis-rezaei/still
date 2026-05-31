import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stillRouter from "./still";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stillRouter);

export default router;
