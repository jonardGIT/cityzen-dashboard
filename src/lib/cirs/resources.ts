import { cirsApi } from "@/lib/cirs/client";
import type {
  Agency,
  Assignment,
  Category,
  Citizen,
  EntityId,
  Incident,
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
  update: (id: EntityId, payload: Partial<Omit<Citizen, "id">>) =>
    cirsApi.update<Citizen, Partial<Omit<Citizen, "id">>>(
      "citizens",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("citizens", id),
};

export const agenciesResource = {
  list: () => cirsApi.list<Agency>("agencies"),
  getById: (id: EntityId) => cirsApi.getById<Agency>("agencies", id),
  create: (payload: Omit<Agency, "id">) =>
    cirsApi.create<Agency, Omit<Agency, "id">>("agencies", payload),
  update: (id: EntityId, payload: Partial<Omit<Agency, "id">>) =>
    cirsApi.update<Agency, Partial<Omit<Agency, "id">>>(
      "agencies",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("agencies", id),
};

export const respondersResource = {
  list: () => cirsApi.list<Responder>("responders"),
  getById: (id: EntityId) => cirsApi.getById<Responder>("responders", id),
  create: (payload: Omit<Responder, "id">) =>
    cirsApi.create<Responder, Omit<Responder, "id">>("responders", payload),
  update: (id: EntityId, payload: Partial<Omit<Responder, "id">>) =>
    cirsApi.update<Responder, Partial<Omit<Responder, "id">>>(
      "responders",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("responders", id),
};

export const statusesResource = {
  list: () => cirsApi.list<Status>("statuses"),
  getById: (id: EntityId) => cirsApi.getById<Status>("statuses", id),
  create: (payload: Omit<Status, "id">) =>
    cirsApi.create<Status, Omit<Status, "id">>("statuses", payload),
  update: (id: EntityId, payload: Partial<Omit<Status, "id">>) =>
    cirsApi.update<Status, Partial<Omit<Status, "id">>>(
      "statuses",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("statuses", id),
};

export const categoriesResource = {
  list: () => cirsApi.list<Category>("categories"),
  getById: (id: EntityId) => cirsApi.getById<Category>("categories", id),
  create: (payload: Omit<Category, "id">) =>
    cirsApi.create<Category, Omit<Category, "id">>("categories", payload),
  update: (id: EntityId, payload: Partial<Omit<Category, "id">>) =>
    cirsApi.update<Category, Partial<Omit<Category, "id">>>(
      "categories",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("categories", id),
};

export const severitiesResource = {
  list: () => cirsApi.list<Severity>("severities"),
  getById: (id: EntityId) => cirsApi.getById<Severity>("severities", id),
  create: (payload: Omit<Severity, "id">) =>
    cirsApi.create<Severity, Omit<Severity, "id">>("severities", payload),
  update: (id: EntityId, payload: Partial<Omit<Severity, "id">>) =>
    cirsApi.update<Severity, Partial<Omit<Severity, "id">>>(
      "severities",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("severities", id),
};

export const incidentsResource = {
  list: () => cirsApi.list<Incident>("incidents"),
  getById: (id: EntityId) => cirsApi.getById<Incident>("incidents", id),
  create: (payload: Omit<Incident, "id">) =>
    cirsApi.create<Incident, Omit<Incident, "id">>("incidents", payload),
  update: (id: EntityId, payload: Partial<Omit<Incident, "id">>) =>
    cirsApi.update<Incident, Partial<Omit<Incident, "id">>>(
      "incidents",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("incidents", id),
};

export const assignmentsResource = {
  list: () => cirsApi.list<Assignment>("assignments"),
  getById: (id: EntityId) => cirsApi.getById<Assignment>("assignments", id),
  create: (payload: Omit<Assignment, "id">) =>
    cirsApi.create<Assignment, Omit<Assignment, "id">>("assignments", payload),
  update: (id: EntityId, payload: Partial<Omit<Assignment, "id">>) =>
    cirsApi.update<Assignment, Partial<Omit<Assignment, "id">>>(
      "assignments",
      id,
      payload,
    ),
  remove: (id: EntityId) => cirsApi.remove("assignments", id),
};

export const usersResource = {
  list: () => cirsApi.list<User>("users"),
  getById: (id: EntityId) => cirsApi.getById<User>("users", id),
  create: (payload: Omit<User, "id">) =>
    cirsApi.create<User, Omit<User, "id">>("users", payload),
  update: (id: EntityId, payload: Partial<Omit<User, "id">>) =>
    cirsApi.update<User, Partial<Omit<User, "id">>>("users", id, payload),
  remove: (id: EntityId) => cirsApi.remove("users", id),
};
