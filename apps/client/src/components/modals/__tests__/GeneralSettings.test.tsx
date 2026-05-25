import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GeneralSettings } from "../settings/GeneralSettings";

const generalSettingsMocks = vi.hoisted(() => ({
  saveSettingsSpy: vi.fn(),
  setThemeSpy: vi.fn(),
  setSnapToGridSpy: vi.fn(),
  mockUI: {
    hideFavicons: false,
    setHideFavicons: vi.fn(),
    aiSuggestionsEnabled: true,
    setAiSuggestionsEnabled: vi.fn(),
    richLinkPreviewsEnabled: false,
    setRichLinkPreviewsEnabled: vi.fn(),
    includeChildBookmarks: false,
    setIncludeChildBookmarks: vi.fn(),
    snapToGrid: false,
    setSnapToGrid: vi.fn(),
  },
}));

vi.mock("@/contexts/UIContext", () => ({
  useUI: () => generalSettingsMocks.mockUI,
}));

vi.mock("@features/bookmarks/settings.ts", () => ({
  saveSettings: generalSettingsMocks.saveSettingsSpy,
  setTheme: generalSettingsMocks.setThemeSpy,
}));

describe("GeneralSettings", () => {
  beforeEach(() => {
    generalSettingsMocks.mockUI.snapToGrid = false;
    generalSettingsMocks.saveSettingsSpy.mockClear();
    generalSettingsMocks.setThemeSpy.mockClear();
    generalSettingsMocks.mockUI.setSnapToGrid.mockClear();
  });

  it("persists snap-to-grid when toggled on", () => {
    render(<GeneralSettings />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Snap to Grid/i }));

    expect(generalSettingsMocks.mockUI.setSnapToGrid).toHaveBeenCalledWith(true);
    expect(generalSettingsMocks.saveSettingsSpy).toHaveBeenCalledWith({
      snap_to_grid: 1,
    });
  });
});