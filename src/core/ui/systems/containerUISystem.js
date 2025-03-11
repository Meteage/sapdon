import { Grid } from "../elements/grid.js";
import { Label } from "../elements/label.js";
import { Panel } from "../elements/panel.js";
import { StackPanel } from "../elements/stackPanel.js";
import { UIElement } from "../elements/uiElement.js";
import { Control } from "../properties/control.js";
import { GridProp } from "../properties/gridProp.js";
import { Layout } from "../properties/layout.js";
import { Text } from "../properties/text.js";
import { ChestUISystem } from "./chest.js";
import { UISystem } from "./UISystem.js";

/**
 * 自定义容器 UI 系统类，用于创建和管理容器界面。
 * 支持动态添加网格项、设置标题、调整尺寸等功能。
 */
export class ContainerUISystem {
  /** @private 网格项的数量 */
  #gridItemNum = 3;

  /**
   * 构造函数，初始化容器 UI 系统。
   * @param {string} identifier - 容器的唯一标识符。
   * @param {string} path - 资源路径。
   */
  constructor(identifier, path) {
    this.system = new UISystem(identifier, path);
    this.title = "自定义容器";
    this.root_panel_size = [200, 200];
    this.gridDimension = [3, 1];

    this.main_panel = new Panel("main_panel");
    this.grids = new Grid("grids");

    // 初始化
    this.#register();
    this.#updateSystem();
  }

  /**
   * 向网格中添加一个网格项。
   * @param {number[]} grid_position - 网格项的位置 [行, 列] 用于定位实体的背包槽。
   * @param {number[]} offset - 网格项的偏移量 [x, y]。
   * @param {Object} [options] - 可选参数，用于配置网格项。
   * @param {boolean} [options.enable=true] - 是否启用该网格项，默认为 true。
   * @param {number[]} [options.size] - 网格项的大小 [宽度, 高度]。
   * @param {UIElement[]} [options.background_images] - 网格项的背景图片控件。
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
   */
  addGridItem(grid_position, offset, options) {

    const gridItem = new UIElement("grid_item",undefined, "chest.chest_grid_item");
    gridItem.addProp("offset",offset);
    gridItem.addProp("enable",options.enable)
    gridItem.addProp("size",options.size)
    gridItem.addVariable("background_images|default",options.background_images)

    this.grids.addGridItem(grid_position, gridItem);
    this.#updateSystem();
    return this;
  }

  addInputGrid(grid_position,offset,options){
    this.addGridItem(grid_position,offset,options);
  }

  addOutputGrid(grid_position,offset,options){
    //设置
    options.enable = false;
    this.addGridItem(grid_position,offset,options);
  }

  /**
   * 向主面板中添加一个 UI 元素。
   * @param {Object} element - 要添加的 UI 元素。
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
   */
  addElementToMain(element) {
    this.main_panel.addControl(element);
    this.#updateSystem();
    return this;
  }

  /**
   * 设置网格的维度（行和列）。
   * @param {number[]} dimension - 网格的维度 [行数, 列数]。
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
   */
  setGridDimension(dimension) {
    this.gridDimension = dimension;
    this.#gridItemNum = dimension[0] * dimension[1];
    this.#updateSystem();
    return this;
  }

  /**
   * 设置容器的标题。
   * @param {string} title - 容器的标题。
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
   */
  setTitle(title) {
    this.title = title;
    this.#updateSystem();
    return this;
  }

  /**
   * 设置根面板的尺寸。
   * @param {number[]} size - 根面板的尺寸 [宽度, 高度]。
   * @returns {ContainerUISystem} 返回当前实例以支持链式调用。
   */
  setSize(size) {
    this.root_panel_size = size;
    this.#updateSystem();
    return this;
  }
  setItemMatrix(n,matrix){
    //5*5
    //设置
    this.setGridDimension([1,n]); //n*n列
    const offset_marix = [];
    for(let i = 0;i< n ;i++) offset_marix.push([(-18)*Math.floor(n/2),i*(-18)]);
    //现在他们在右上角了
    console.log("offoset:"+offset_marix)

    matrix.forEach((row, rowIndex) => {
      console.log("row:"+row)
      row.forEach((value, colIndex) => {
        if (value === 0) return;
        console.log("value:"+value)
        //y
        offset_marix[value-1][1] += rowIndex*(18)
        //x
        offset_marix[value-1][0] += colIndex*(18)

      });
    });

    offset_marix.forEach((v,i)=>{
      this.addGridItem([0,i],v)
    })
  }

  /**
   * 注册容器 UI 系统。
   * @private
   */
  #register() {
    ChestUISystem.registerContainerUI(this.system.name, `${this.system.namespace}.container_root_panel`);
  }

  /**
   * 更新 UI 系统，根据当前属性重新构建 UI。
   * @private
   */
  #updateSystem() {
    const container_root_panel = new Panel("container_root_panel");
    // 设置根面板的尺寸
    container_root_panel.setLayout(new Layout().setSize(this.root_panel_size));

    // 添加控件
    container_root_panel.addControls([
      // 通用面板
      {
        "common_panel@common.common_panel": {},
      },
      // 飞行动画图标按钮
      {
        "inventory_selected_icon_button@common.inventory_selected_icon_button": {},
      },
      // 主内容面板
      new StackPanel("container_panel")
        .setControl(new Control().setLayer(2))
        // 标题
        .addStack(
          ["100%", "10%"],
          new Label("title")
            .setControl(new Control().setLayer(12))
            .setText(new Text().setText(this.title).setColor([0, 0, 0]))
        )
        // 自定义网格
        .addStack(
          ["100%", "40%"],
          //有一丢丢bug
          this.main_panel.control =
            this.grids.setGridProp(
              new GridProp()
                .setGridDimensions(this.gridDimension)
                .setGridItemTemplate("chest.chest_grid_item")
            ).setCollectionName("container_items")
          
        )
        // 玩家库存面板
        .addStack(
          ["100%", "50%"],
          new Panel("inventory_panel").addControls([
            // 玩家背包
            {
              "inventory_panel_bottom_half_with_label@common.inventory_panel_bottom_half_with_label": {},
            },
            // 物品栏
            {
              "hotbar_grid@common.hotbar_grid_template": {},
            },
            {
              "inventory_take_progress_icon_button@common.inventory_take_progress_icon_button": {},
            },
          ])
        ),
    ]);

    // 更新系统
    this.system.addElement(container_root_panel);
  }
}


/**
 * 例子
 * 
 * // 创建一个新的容器 UI 系统
const containerUI = new ContainerUISystem("custom_container", "ui/");

// 设置标题和尺寸
containerUI.setTitle("我的自定义容器").setSize([300, 400]);

// 设置网格维度（2 行 1 列）
containerUI.setGridDimension([2, 1]);

// 添加网格项
containerUI.addGridItem([0, 0], [10, 10]); // 在将实体背包(0, 0) 项映射于此，偏移量为 [10, 10]
containerUI.addGridItem([1, 0], [20, 20]); // 在将实体背包(1, 0) 项映射于此，偏移量为 [20, 20]

// 向主面板添加自定义元素
const customElement = new Panel("custom_element");
containerUI.addElementToMain(customElement);
 */