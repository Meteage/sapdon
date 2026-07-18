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
    fillColor?: [number, number, number]
    fillUv?: [number, number]
    segments?: {
        count: number
        color: [number, number, number]
    }
    hudSize?: [string | number, string | number]
    anchorFrom?: string
    anchorTo?: string
    offset?: [number, number]
    clipDirection?: string
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
            offset: [0, 0],
            clipDirection: "left",
            fillUv: [0, 5],
            ...options
        }
        this.panel = this.build()
    }

    private build(): Panel {
        const rootPanel = new Panel(this.options.id, undefined)

        const bgPanel = new Panel(`${this.options.id}_bg`, undefined)
        for (let l = 0; l < this.options.layers.length; l++) {
            const layer = this.options.layers[l]
            const img = new Image(`${this.options.id}_l${l}`, undefined)
            img.setSprite(
                new Sprite()
                    .setTexture(this.options.texture)
                    .setUV(this.options.uv!)
                    .setUVSize(this.options.uvSize!)
                    .setClipDirection(this.options.clipDirection!)
                    .setClipPixelPerfect(true)
                    .setClipRatio(layer.clipRatio)
            )
            img.setLayout(new Layout().setSize(this.options.barSize!))
            img.addProp("color", layer.color)
            img.setControl(new Control().setLayer(l))
            bgPanel.addControl(img)
        }
        rootPanel.addControl(bgPanel)

        const hsp = new HudStatePanel(`${this.options.id}_states`)

        for (let i = 0; i < this.options.states; i++) {
            const statePanel = new Panel(`${this.options.id}_s${i}`, undefined)
            const fillRatio = this.options.states > 1
                ? 1 - i / this.options.states
                : 0

            if (this.options.fillColor) {
                const fillImg = new Image(`${this.options.id}_fill_s${i}`, undefined)
                fillImg.setSprite(
                    new Sprite()
                        .setTexture(this.options.texture)
                        .setUV(this.options.fillUv!)
                        .setUVSize(this.options.uvSize!)
                        .setClipDirection(this.options.clipDirection!)
                        .setClipPixelPerfect(true)
                        .setClipRatio(fillRatio)
                )
                fillImg.setLayout(new Layout().setSize(this.options.barSize!))
                fillImg.addProp("color", this.options.fillColor)
                fillImg.setControl(new Control().setLayer(this.options.layers.length))
                statePanel.addControl(fillImg)
            }

            if (this.options.segments) {
                const segCount = this.options.segments.count
                const filledCount = Math.min(i, segCount)
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

        rootPanel.addControl(hsp.getPanel())

        rootPanel.setLayout(
            new Layout()
                .setAnchorFrom(this.options.anchorFrom!)
                .setAnchorTo(this.options.anchorTo!)
                .setSize(this.options.hudSize!)
                .setOffset(this.options.offset!)
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
