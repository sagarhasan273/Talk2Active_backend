import { UserRoutes } from "./user.router";
import express from "express";
import { SettingRoutes } from "./settings.router";
import { InventoryRouter } from "./inventory.router";
import { PostRoutes } from "./post.router";
import { PostEngagementRoutes } from "./post-engagement.router";

const app = express();

const userRouters = new UserRoutes();
app.use('/user', userRouters.router);

const settingsRouters = new SettingRoutes();
app.use('/settings', settingsRouters.router);

const inventoryRouters = new InventoryRouter();
app.use('/inventory', inventoryRouters.router);

const postRouters = new PostRoutes();
app.use('/post', postRouters.router);

const postEngagementRouters = new PostEngagementRoutes();
app.use('/post-engagement', postEngagementRouters.router);

export const rootRouter = app;