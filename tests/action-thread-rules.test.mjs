import assert from "node:assert/strict";
import test from "node:test";

function createThread(store, thread) {
  const duplicate = store.threads.some(
    (item) =>
      item.currentStatus === "active" &&
      item.prospectId === thread.prospectId &&
      item.contactId === thread.contactId
  );

  if (duplicate) {
    throw new Error("duplicate_active_thread");
  }

  store.threads.push({ ...thread, currentStatus: "active" });
}

function completeThread(store, threadId, event) {
  const thread = store.threads.find((item) => item.id === threadId);
  if (!thread) throw new Error("missing_thread");

  store.events.push({ ...event, threadId });

  if (event.prospectStatusAfterAction === "perdu") {
    thread.currentStatus = "closed_lost";
    thread.prospectStatus = "perdu";
    thread.closedAt = event.completedAt;
    return;
  }

  thread.currentActionType = event.nextActionType;
  thread.currentDueDate = event.nextDueDate;
  thread.currentPriority = event.priorityAfterAction;
  thread.prospectStatus = event.prospectStatusAfterAction;
  thread.lastCompletedActionAt = event.completedAt;
}

function assertCanModifySharedActions(profile) {
  if (profile.role !== "admin") {
    throw new Error("admin_only_shared_actions");
  }
}

test("creation premiere fiche refuse un doublon actif client/contact", () => {
  const store = { threads: [], events: [] };

  createThread(store, {
    id: "thread-1",
    prospectId: "prospect-1",
    contactId: "contact-1",
    currentActionType: "appel"
  });

  assert.throws(
    () =>
      createThread(store, {
        id: "thread-2",
        prospectId: "prospect-1",
        contactId: "contact-1",
        currentActionType: "email"
      }),
    /duplicate_active_thread/
  );
});

test("realisation action ajoute historique et met a jour la prochaine action", () => {
  const store = {
    threads: [
      {
        id: "thread-1",
        prospectId: "prospect-1",
        contactId: "contact-1",
        currentActionType: "appel",
        currentDueDate: "2026-06-16T07:00:00.000Z",
        currentPriority: "normale",
        currentStatus: "active",
        prospectStatus: "a_qualifier"
      }
    ],
    events: []
  };

  completeThread(store, "thread-1", {
    completedAt: "2026-06-16T08:00:00.000Z",
    actionType: "appel",
    prospectStatusAfterAction: "relance_a_faire",
    nextActionType: "email",
    nextDueDate: "2026-06-20T08:00:00.000Z",
    priorityAfterAction: "haute"
  });

  assert.equal(store.events.length, 1);
  assert.equal(store.threads[0].currentStatus, "active");
  assert.equal(store.threads[0].currentActionType, "email");
  assert.equal(store.threads[0].currentDueDate, "2026-06-20T08:00:00.000Z");
  assert.equal(store.threads[0].currentPriority, "haute");
});

test("cloture perdu ajoute historique et retire la fiche des actives", () => {
  const store = {
    threads: [
      {
        id: "thread-1",
        prospectId: "prospect-1",
        contactId: "contact-1",
        currentStatus: "active",
        prospectStatus: "relance_a_faire"
      }
    ],
    events: []
  };

  completeThread(store, "thread-1", {
    completedAt: "2026-06-16T08:00:00.000Z",
    actionType: "appel",
    prospectStatusAfterAction: "perdu"
  });

  assert.equal(store.events.length, 1);
  assert.equal(store.threads[0].currentStatus, "closed_lost");
  assert.equal(store.threads[0].prospectStatus, "perdu");
});

test("historique reste rattache au couple client/contact via la fiche", () => {
  const store = {
    threads: [
      {
        id: "thread-1",
        prospectId: "prospect-1",
        contactId: "contact-1",
        currentStatus: "active"
      }
    ],
    events: [
      { threadId: "thread-1", actionType: "appel" },
      { threadId: "thread-1", actionType: "email" },
      { threadId: "other", actionType: "devis" }
    ]
  };

  const history = store.events.filter((event) => event.threadId === "thread-1");

  assert.deepEqual(
    history.map((event) => event.actionType),
    ["appel", "email"]
  );
});

test("actions partagees modifiables uniquement par admin", () => {
  assert.doesNotThrow(() => assertCanModifySharedActions({ role: "admin" }));
  assert.throws(
    () => assertCanModifySharedActions({ role: "modification" }),
    /admin_only_shared_actions/
  );
  assert.throws(
    () => assertCanModifySharedActions({ role: "lecteur" }),
    /admin_only_shared_actions/
  );
});
