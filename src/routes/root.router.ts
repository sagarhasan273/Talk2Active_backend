import express from "express";
import { AuthRoutes } from "./auth.router";
import { ChatRouter } from "./chat.router";
import { InventoryRouter } from "./inventory.router";
import { MessageRouter } from "./message.router";
import { PostEngagementRoutes } from "./post-engagement.router";
import { PostRoutes } from "./post.router";
import { SettingRoutes } from "./settings.router";
import { RelationshipRouter } from "./social.router";
import { UserSuggestionRoutes } from "./user-suggestion.router";
import { UserRoutes } from "./user.router";

const app = express();

const authRouters = new AuthRoutes();
app.use('/auth', authRouters.router);

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

const socialRouters = new RelationshipRouter();
app.use('/social', socialRouters.router);

const userSuggestionRouters = new UserSuggestionRoutes();
app.use('/suggestion', userSuggestionRouters.router);

const chatRouters = new ChatRouter();
app.use('/room', chatRouters.router);

const messageRouters = new MessageRouter();
app.use('/message', messageRouters.router);

export const rootRouter = app;