import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrigamiViewer } from "./index";
import { craneProcedure } from "@/features/origami-viewer-v2/mocks/crane";

const meta = { title: "Components/v2/OrigamiViewer", component: OrigamiViewer, parameters: { layout: "fullscreen" }, args: { model: { id: "crane", name: "鶴", description: "V2のデータで鶴を折ります。", color: "#ed7070", procedure: craneProcedure } } } satisfies Meta<typeof OrigamiViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Steps: Story = {};
export const Completed: Story = { args: { completed: true } };
export const Empty: Story = { args: { model: { ...meta.args.model, procedure: { version: 2, size: 100, steps: [], history: [], finalBoards: [{ polygon: [[-50,-50,0],[50,-50,0],[50,50,0],[-50,50,0]], layer: 0 }] } } } };
