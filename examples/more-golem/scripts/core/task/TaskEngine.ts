import { system } from "@minecraft/server"
import { ITask } from "./ITask.js"
import { ITaskContext } from "../types.js"

export class TaskEngine {
  private tasks: ITask[] = []
  private cooldownEnd = new Map<string, number>()

  register(task: ITask) {
    this.tasks.push(task)
  }

  unregister(name: string) {
    this.tasks = this.tasks.filter(t => t.name !== name)
  }

  setCooldown(taskName: string, duration: number) {
    this.cooldownEnd.set(taskName, system.currentTick + duration)
  }

  tick(ctx: ITaskContext) {
    const now = system.currentTick
    const sorted = [...this.tasks].sort((a, b) => a.priority - b.priority)
    for (const task of sorted) {
      const cdEnd = this.cooldownEnd.get(task.name)
      if (cdEnd && now < cdEnd) continue
      if (task.condition(ctx)) {
        task.execute(ctx)
        return
      }
    }
  }
}
