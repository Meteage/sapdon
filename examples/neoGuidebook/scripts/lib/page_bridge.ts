import { ActionFormData, ActionFormResponse } from "@minecraft/server-ui"
import { world, Player } from "@minecraft/server"

interface PageCallbacks {
    onEnter?: (pageId: string, index: number) => void
    onLeave?: (pageId: string, index: number) => void
}

interface BridgeOptions {
    debug?: boolean
}

export class NeoGuidebookBridge {
    private uiName: string
    private pageIds: string[]
    private totalPages: number
    private hooks: Map<string, PageCallbacks>
    private currentIndex: number
    private debug: boolean

    constructor(uiName: string, pageIds: string[], options: BridgeOptions = {}) {
        this.uiName = uiName
        this.pageIds = pageIds
        this.totalPages = pageIds.length
        this.hooks = new Map()
        this.currentIndex = 0
        this.debug = options.debug === true
    }

    private log(...args: string[]): void {
        if (this.debug) world.sendMessage("[NeoGuidebook] " + args.join(" "))
    }

    onPage(pageId: string, callbacks: PageCallbacks): this {
        this.hooks.set(pageId, callbacks)
        return this
    }

    show(player: Player, startIndex: number = 0): void {
        this.currentIndex = Math.max(0, Math.min(startIndex, this.totalPages - 1))
        this.log("show() startIndex=" + startIndex + " → page=" + this.pageIds[this.currentIndex])
        this.open(player)
    }

    open(player: Player): void {
        const pageId = this.pageIds[this.currentIndex]
        const hook = this.hooks.get(pageId)
        if (hook?.onEnter) hook.onEnter(pageId, this.currentIndex)

        this.log("open() page=" + pageId + " index=" + this.currentIndex + "/" + (this.totalPages - 1))

        const form = new ActionFormData()
            .title(this.uiName)
            .body(pageId)

        const actions: string[] = []

        const hasPrev = this.currentIndex > 0
        const hasNext = this.currentIndex < this.totalPages - 1
        const hasHome = this.currentIndex !== 0
        const isChapterList = this.currentIndex === 0

        if (hasPrev) { form.button("prev_button"); actions.push("prev") }
        if (hasNext) { form.button("next_button"); actions.push("next") }
        if (hasHome) { form.button("home_button"); actions.push("home") }

        this.log("  buttons: prev=" + hasPrev + " next=" + hasNext + " home=" + hasHome)

        if (isChapterList) {
            for (let i = 1; i < this.totalPages; i++) {
                form.button(`item_${i - 1}_button`)
                actions.push(`goto:${i}`)
            }
            this.log("  + " + (this.totalPages - 1) + " chapter buttons, total actions=" + actions.length)
        }

        form.show(player).then((response: ActionFormResponse) => {
            if (response.canceled) {
                this.log("  canceled")
                if (hook?.onLeave) hook.onLeave(pageId, this.currentIndex)
                return
            }

            const action = actions[response.selection!]
            this.log("  selection=" + response.selection + " action=" + action)

            if (!action) return

            const prev = this.currentIndex

            if (action === "prev") this.currentIndex--
            else if (action === "next") this.currentIndex++
            else if (action === "home") this.currentIndex = 0
            else if (action.startsWith("goto:"))
                this.currentIndex = parseInt(action.split(":")[1], 10)

            if (hook?.onLeave) hook.onLeave(pageId, prev)
            if (this.currentIndex !== prev) {
                this.log("  navigate " + prev + " → " + this.currentIndex + " (" + this.pageIds[this.currentIndex] + ")")
                this.open(player)
            } else {
                this.log("  no navigation")
            }
        })
    }
}
