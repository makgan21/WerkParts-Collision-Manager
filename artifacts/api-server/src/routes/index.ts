import { Router, type IRouter } from "express";
import healthRouter from "./health";
import partsRouter from "./parts";
import suppliersRouter from "./suppliers";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(partsRouter);
router.use(suppliersRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);

export default router;
