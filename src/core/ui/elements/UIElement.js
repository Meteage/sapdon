
/**
 * Elements ​
    A JSON UI element is the basic form of data within JSON UI. Elements must have a unique name for each namespace so as to not have a conflict with other elements of the same name yet may have different functions.

    Here the element type is label so it will render a text of Hello World when called:

    vanilla/ui/example_file.json

    {
        "test_element": {
            "type": "label",
            "text": "Hello World"
        }
    }
    Types ​
    The following are some of the element types, which are possible values for the type property:

    label - for creating text objects
    image - for rendering images from a filepath provided
    button - for creating interactive and clickable elements
    panel - an empty container where you can store all other elements that may overlap to each other
    stack_panel - an empty container where you can store all other elements in a stack that doesn't overlap to each other
    grid - uses another element as a template, and then renders it repeatedly in multiple rows and columns
    factory - renders an element based off of another element, is capable of calling hardcoded values and variables
    custom - is paired with another property renderer which renders hardcoded JSON UI elements
    screen - elements that are called by the game directly, usually root panel elements
 */

// 基础元素类
export class UIElement {
    constructor(id, type, template) {
        this.type = type;
        this.id = template ? `${id}@${template}` : id;
        this.properties = new Map().set("type",type);
        this.variables = new Map();
        this.modifications = [];
    }

    addVariable(name,value){
        this.variables.set(`$${name}`,value);
        return this;
    }

    addProp(name, value) {
        this.properties.set(name,value);
        return this;
    }

    addModification(modification){
        this.modifications.push({
            array_name: modification.array_name,
            operation:modification.operation,
            value:modification.value
        });
        this.addProp("modifications",this.modifications)
        return this;
    }

    serialize() {
        const json = Object.fromEntries(this.properties);
        Object.assign(json,Object.fromEntries(this.variables))
        return {
            [this.id]:json
        };
    }
}


//Modifications ​方法
/**
 * Modifications ​
    To modify JSON UI in a non-intrusive way, you can use the modifications property to modify previously existing JSON UI elements from other packs (usually vanilla JSON UI files). Doing this makes sure only necessary parts are modified unless otherwise intended, to improve compatibility with other packs that modify the JSON UI.

    Modification	Description
    insert_back	insert at end of array
    insert_front	insert at start of array
    insert_after	insert after target in array
    insert_before	insert before target in array
    move_back	move target to end of array
    move_front	move target to start of array
    move_after	move target after second target
    move_before	move target before second target
    swap	swap first target with second target
    replace	replace first target with second target
    remove	remove target
 */
// Modifications操作类型常量类
export class Modifications {
    static OPERATION = Object.freeze({
        INSERT_BACK: "insert_back",
        INSERT_FRONT: "insert_front",
        INSERT_AFTER: "insert_after",
        INSERT_BEFORE: "insert_before",
        MOVE_BACK: "move_back",
        MOVE_FRONT: "move_front",
        MOVE_AFTER: "move_after",
        MOVE_BEFORE: "move_before",
        SWAP: "swap",
        REPLACE: "replace",
        REMOVE: "remove"
    });
}




