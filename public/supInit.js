function initMock()
{
    ServerStore.debug.createMockUser({
      userid: "u_123",
      displayName: "Alice",
      position: { x: 200, y: 150 },
      stats: { ...DEFAULT_STATS, intelligence: 2, might: 1 },
      skillpoints: 1,
      inventory: ["sword", "potion"],
      updatedAt: 1731803999000,
    }, true);

    ServerStore.debug.createMockUser({
      userid: "u_456",
      displayName: "Bob",
      position: { x: 240, y: 150 },
      stats: { ...DEFAULT_STATS },
    });
}