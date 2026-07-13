import { ITaskContext } from "../types.js"

export interface ITask {
  readonly name: string
  readonly priority: number
  readonly timeout: number
  condition(ctx: ITaskContext): boolean
  execute(ctx: ITaskContext): void
}
