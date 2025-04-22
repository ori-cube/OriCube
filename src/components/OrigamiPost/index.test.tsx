import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { OrigamiPost } from ".";

describe("Page", () => {
  it("renders a heading", () => {
    render(<OrigamiPost />);

    const heading = screen.getByRole("heading", { level: 2 });

    expect(heading).toBeInTheDocument();
  });
});
