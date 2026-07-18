import { HudStatePanel } from "../systems/hud/hudElement.js"
import { Panel } from "../elements/panel.js"
import { Image } from "../elements/image.js"
import { StackPanel } from "../elements/stackPanel.js"
import { Sprite } from "../properties/sprite.js"
import { Layout } from "../properties/layout.js"
import { Control } from "../properties/control.js"
import { HudUISystem } from "../systems/hud/hud.js"

interface ProgressBarLayer {
    color: [number, number, number]
    clipRatio: number
}

interface HudProgressBarOptions {
    id: string
    texture: string
    uv?: [number, number]
    uvSize?: [number, number]
    barSize?: [string | number, string | number]
    layers: ProgressBarLayer[]
    states: number
    segments?: {
        count: number
        color: [number, number, number]
    }
    hudSize?: [string | number, string | number]
    anchorFrom?: string
    anchorTo?: string
}

export class HudProgressBar {
    private panel: Panel
    private options: HudProgressBarOptions

    constructor(options: HudProgressBarOptions) {
        this.options = {
            uv: [0, 0],
            uvSize: [182, 5],
            barSize: [182, 5],
            hudSize: ["30%", "6%"],
            anchorFrom: "bottom_left",
            anchorTo: "bottom_left",
            ...options
        }
        this.panel = this.build()
    }

    private build(): Panel {
        const hsp = new HudStatePanel(this.options.id)

        for (let i = 0; i < this.options.states; i++) {
            const progress = this.options.states > 1
                ? i / (this.options.states - 1)
                : 0

            const statePanel = new Panel(`${this.options.id}_s${i}`, undefined)

            for (let l = 0; l < this.options.layers.length; l++) {
                const layer = this.options.layers[l]
                const img = new Image(`${this.options.id}_l${l}_s${i}`, undefined)
                img.setSprite(
                    new Sprite()
                        .setTexture(this.options.texture)
                        .setUV(this.options.uv!)
                        .setUVSize(this.options.uvSize!)
                        .setClipDirection("left")
                        .setClipPixelPerfect(true)
                        .setClipRatio(layer.clipRatio * progress)
                )
                img.setLayout(new Layout().setSize(this.options.barSize!))
                img.addProp("color", layer.color)
                img.setControl(new Control().setLayer(l))
                statePanel.addControl(img)
            }

            if (this.options.segments) {
                const segCount = this.options.segments.count
                const filledCount = Math.ceil(segCount * progress)
                const segWidth = Math.floor(100 / segCount)

                const segPanel = new StackPanel(`${this.options.id}_seg_g${i}`, undefined)
                    .setOrientation("horizontal")
                    .setLayout(new Layout().setSize(this.options.barSize!))

                for (let s = 0; s < segCount; s++) {
                    const isFilled = s < filledCount
                    segPanel.addStack(
                        [`${segWidth}%`, "100%"],
                        new Image(`${this.options.id}_seg${s}_s${i}`, undefined)
                            .setSprite(
                                new Sprite()
                                    .setTexture(this.options.texture)
                                    .setUV([1, 5])
                                    .setUVSize([180, 5])
                                    .setTiled(true)
                            )
                            .addProp("color", this.options.segments.color)
                            .setControl(
                                new Control()
                                    .setLayer(this.options.layers.length + 1)
                                    .setAlpha(isFilled ? 1 : 0)
                            )
                    )
                }

                statePanel.addControl(segPanel)
            }

            hsp.addStateControl(i, statePanel)
        }

        const rootPanel = hsp.getPanel()
        rootPanel.setLayout(
            new Layout()
                .setAnchorFrom(this.options.anchorFrom!)
                .setAnchorTo(this.options.anchorTo!)
                .setSize(this.options.hudSize!)
        )

        return rootPanel
    }

    getPanel(): Panel {
        return this.panel
    }

    mountToHud(): void {
        HudUISystem.mountRootElement(this.panel)
    }
}
