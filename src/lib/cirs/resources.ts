import { cirsApi } from "@/lib/cirs/client";
import type {
  Assignment,
  Category,
  Citizen,
  EntityId,
  Incident,
  Location,
  Responder,
  Severity,
  Status,
  User,
} from "@/lib/cirs/types";

export const citizensResource = {
  list: () => cirsApi.list<Citizen>("citizens"),
  getById: (id: EntityId) => cirsApi.getById<Citizen>("citizens", id),
  create: (payload: Omit<Citizen, "id">) =>
    cirsApi.create<Citizen, Omit<Citizen, "id">>("citizens", payload),
};

export const respondersResource = {
  list: () => cirsApi.list<Responder>("responders"),
  getById: (id: EntityId) => cirsApi.getById<Responder>("responders", id),
  create: (payload: Omit<Responder, "id">) =>
    cirsApi.create<Responder, Omit<Responder, "id">>("responders", payload),
};

export const statusesResource = {
  list: () => cirsApi.list<Status>("statuses"),
  getById: (id: EntityId) => cirsApi.getById<Status>("statuses", id),
  create: (payload: Omit<Status, "id">) =>
    cirsApi.create<Status, Omit<Status, "id">>("statuses", payload),
};

export const categoriesResource = {
  list: () => cirsApi.list<Category>("categories"),
  getById: (id: EntityId) => cirsApi.getById<Category>("categories", id),
  create: (payload: Omit<Category, "id">) =>
    cirsApi.create<Category, Omit<Category, "id">>("categories", payload),
};

export const severitiesResource = {
  list: () => cirsApi.list<Severity>("severities"),
  getById: (id: EntityId) => cirsApi.getById<Severity>("severities", id),
  create: (payload: Omit<Severity, "id">) =>
    cirsApi.create<Severity, Omit<Severity, "id">>("severities", payload),
};

export const locationsResource = {
  list: () => cirsApi.list<Location>("locations"),
  getById: (id: EntityId) => cirsApi.getById<Location>("locations", id),
  create: (payload: Omit<Location, "id">) =>
    cirsApi.create<Location, Omit<Location, "id">>("locations", payload),
};

export const incidentsResource = {
  list: () => cirsApi.list<Incident>("incidents"),
  getById: (id: EntityId) => cirsApi.getById<Incident>("incidents", id),
  create: (payload: Omit<Incident, "id">) =>
    cirsApi.create<Incident, Omit<Incident, "id">>("incidents", payload),
};

export const assignmentsResource = {
  list: () => cirsApi.list<Assignment>("assignments"),
  getById: (id: EntityId) => cirsApi.getById<Assignment>("assignments", id),
  create: (payload: Omit<Assignment, "id">) =>
    cirsApi.create<Assignment, Omit<Assignment, "id">>("assignments", payload),
};

export const usersResource = {
  list: () => cirsApi.list<User>("users"),
  getById: (id: EntityId) => cirsApi.getById<User>("users", id),
  create: (payload: Omit<User, "id">) =>
    cirsApi.create<User, Omit<User, "id">>("users", payload),
};
