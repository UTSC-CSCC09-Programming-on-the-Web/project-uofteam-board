class CanvasRooms {
  private static instance: CanvasRooms;
  private rooms: Map<number, Set<number>>; // Maps boardId to a set of userIds

  private constructor() {
    this.rooms = new Map();
  }

  public static getInstance(): CanvasRooms {
    if (!CanvasRooms.instance) {
      CanvasRooms.instance = new CanvasRooms();
    }
    return CanvasRooms.instance;
  }

  public joinCanvas(boardId: number, userId: number): void {
    if (!this.rooms.has(boardId)) {
      this.rooms.set(boardId, new Set());
    }
    this.rooms.get(boardId)?.add(userId);
  }

  public leaveCanvas(roomId: string, userId: string): void {
    this.rooms.get(roomId)?.delete(userId);
  }

  public getUsersInRoom(roomId: string): Set<string> | undefined {
    return this.rooms.get(roomId);
  }
}