import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, fireEvent } from "../test-utils";
import { DashboardGrid } from "./DashboardGrid.tsx";
import type { DashboardWidget, Bookmark } from "../types/index";

const dndMocks = vi.hoisted(() => ({
  onDragEnd: null as
    | ((event: {
        active: { id: string };
        delta: { x: number; y: number };
      }) => void)
    | null,
  setNodeRef: vi.fn(),
}));

vi.mock("@dnd-kit/core", async () => {
  const actual =
    await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");

  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode;
      onDragEnd?: (event: {
        active: { id: string };
        delta: { x: number; y: number };
      }) => void;
    }) => {
      dndMocks.onDragEnd = onDragEnd ?? null;
      return children;
    },
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn(() => []),
    useDraggable: vi.fn(() => ({
      attributes: {},
      listeners: {},
      setNodeRef: dndMocks.setNodeRef,
      transform: null,
    })),
  };
});

const widgets: DashboardWidget[] = [
  {
    id: "w-1",
    type: "folder",
    title: "Frontend",
    config: {},
    x: 0,
    y: 0,
    w: 320,
    h: 260,
  },
  {
    id: "w-2",
    type: "tag",
    title: "Urgent",
    config: {},
    x: 330,
    y: 0,
    w: 320,
    h: 260,
  },
  {
    id: "w-3",
    type: "stats",
    title: "Stats",
    config: {},
    x: 660,
    y: 0,
    w: 320,
    h: 260,
  },
];

const sampleBookmarks: Bookmark[] = [
  {
    id: "b-1",
    title: "AnchorMarks",
    url: "https://anchormarks.com",
    tags: "productivity",
  },
];

describe("DashboardGrid", () => {
  it("renders empty state when no widgets exist", () => {
    renderWithProviders(<DashboardGrid widgets={[]} />);
    expect(screen.getByTestId("dashboard-empty-state")).toBeTruthy();
  });

  it("maps widgets into DashboardWidget components", () => {
    renderWithProviders(
      <DashboardGrid
        widgets={widgets}
        previewBookmarksByWidgetId={{
          "w-1": sampleBookmarks,
          "w-2": sampleBookmarks,
        }}
        metricsByWidgetId={{ "w-3": { Bookmarks: 99, Favorites: 7 } }}
      />,
    );

    expect(screen.getByTestId("dashboard-grid")).toBeTruthy();
    expect(screen.getAllByTestId("dashboard-widget")).toHaveLength(3);
    expect(screen.getByText("Frontend")).toBeTruthy();
    expect(screen.getByText("Urgent")).toBeTruthy();
    expect(screen.getByText("Stats")).toBeTruthy();
    expect(screen.getByText("Bookmarks")).toBeTruthy();
    expect(screen.getAllByText("99").length).toBeGreaterThan(0);
  });

  it("forwards remove events from child widgets", () => {
    const onRemoveWidget = vi.fn();

    renderWithProviders(
      <DashboardGrid
        widgets={widgets}
        isEditMode={true}
        onRemoveWidget={onRemoveWidget}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove widget" })[0],
    );

    expect(onRemoveWidget).toHaveBeenCalledWith("w-1");
  });

  it("auto-sizes dashboard canvas from widget positions", () => {
    renderWithProviders(
      <DashboardGrid
        widgets={[
          {
            id: "w-low",
            type: "folder",
            title: "Low Widget",
            config: {},
            x: 100,
            y: 1200,
            w: 480,
            h: 300,
          },
        ]}
      />,
    );

    const canvas = document.querySelector(
      ".dashboard-widgets-container",
    ) as HTMLElement | null;

    expect(canvas).toBeTruthy();
    expect(canvas?.style.height).toBe("1540px");
    expect(canvas?.style.width).toBe("620px");
  });

  it("snaps dropped widgets to the dashboard grid", () => {
    const onMoveWidget = vi.fn();

    renderWithProviders(
      <DashboardGrid
        widgets={widgets}
        isEditMode={true}
        onMoveWidget={onMoveWidget}
      />,
    );

    dndMocks.onDragEnd?.({
      active: { id: "w-2" },
      delta: { x: 17, y: 27 },
    });

    expect(onMoveWidget).toHaveBeenCalledWith("w-2", 340, 20);
  });
});
