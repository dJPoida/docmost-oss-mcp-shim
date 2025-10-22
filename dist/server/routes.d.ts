import { Request, Response, NextFunction } from 'express';
export declare function buildRouter({ requireShimKey, }: {
    requireShimKey: (req: Request, res: Response, next: NextFunction) => void;
}): import("express-serve-static-core").Router;
//# sourceMappingURL=routes.d.ts.map