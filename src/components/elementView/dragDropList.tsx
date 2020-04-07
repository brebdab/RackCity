import React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { Callout } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

// fake data generator

// a little function to help us with reordering the result
const reorder = (list: any, startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 4;

const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",
  padding: grid * 2,
  margin: `0 ${grid}px 0 0`,
  borderRadius: 3,

  // change background colour if dragging
  background: isDragging ? "#202B33" : "#30404D",

  // styles we need to apply on draggables
  ...draggableStyle,
});

const getListStyle = (isDraggingOver: boolean) => ({
  background: "#202B33",
  display: "flex",
  borderRadius: 5,
  padding: 2,
  minHeight: 40,
  width: "100%",
  overflow: "auto",
  margin: 5,
});
export enum DragDropListTypes {
  FILTER = "filter",
  SORT = "sort",
}
export interface DragDropListProps {
  items: Array<any>;
  type: DragDropListTypes;
  renderItem(item: any): any;
  onChange?(items: Array<any>): void;
}
class DragDropList extends React.Component<DragDropListProps> {
  //   constructor(props) {
  //     super(props);
  //     this.state = {
  //       items: getItems(6),
  //     };
  //     this.onDragEnd = this.onDragEnd.bind(this);
  //   }

  onDragEnd = (result: DropResult) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = reorder(
      this.props.items,
      result.source.index,
      result.destination.index
    );

    this.setState({
      items,
    });
    if (this.props.onChange) {
      this.props.onChange(items);
    }
  };
  getEmptyListMessage() {
    if (this.props.type === DragDropListTypes.FILTER) {
      return <Callout>Select filter(s) above</Callout>;
    }
    if (this.props.type === DragDropListTypes.SORT) {
      return <Callout>Select column(s) to sort by below</Callout>;
    }
  }
  getIcon() {
    if (this.props.type === DragDropListTypes.FILTER) {
      return (
        <Callout className="callout-icon" icon={IconNames.FILTER}></Callout>
      );
    }
    if (this.props.type === DragDropListTypes.SORT) {
      return (
        <Callout
          className="callout-icon"
          icon={IconNames.DOUBLE_CARET_VERTICAL}
        ></Callout>
      );
    }
  }
  // Normally you would want to split things out into separate components.
  // But in this example everything is just done in one place for simplicity
  render() {
    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}
              {...provided.droppableProps}
            >
              {this.getIcon()}
              {this.props.items.length > 0
                ? this.props.items.map((item: any, index: number) => (
                    <Draggable
                      key={item.id}
                      draggableId={item.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                        >
                          {this.props.renderItem(item)}
                        </div>
                      )}
                    </Draggable>
                  ))
                : this.getEmptyListMessage()}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );
  }
}

export default DragDropList;
