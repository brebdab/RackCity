import React from "react";
import { Graph } from "react-d3-graph";
import { Classes } from "@blueprintjs/core";

interface NetworkGraphProps {}

class NetworkGraph extends React.Component<NetworkGraphProps> {
  asset_id: any = {
    Harry: "1",
    Sally: "1",
    Alice: "1"
  };
  data = {
    nodes: [{ id: "Harry" }, { id: "Sally" }, { id: "Alice" }],
    links: [
      { source: "Harry", target: "Sally" },
      { source: "Harry", target: "Alice" },
      { source: "Alice", target: "Harry" }
    ]
  };

  // the graph configuration, you only need to pass down properties
  // that you want to override, otherwise default ones will be used
  myConfig = {
    nodeHighlightBehavior: true,
    node: {
      color: "lightgreen",
      fontColor: "white",
      size: 400,
      highlightStrokeColor: "blue"
    },
    link: {
      highlightColor: "lightblue"
    }
  };

  // graph event callbacks
  onClickGraph = function() {
    window.alert(`Clicked the graph background`);
  };

  onClickNode = (nodeId: any) => {
    window.alert(`Clicked node ${this.asset_id[nodeId]}`);
  };

  onDoubleClickNode = function(nodeId: any) {
    window.alert(`Double clicked node ${nodeId}`);
  };

  onRightClickNode = function(event: any, nodeId: any) {
    window.alert(`Right clicked node ${nodeId}`);
  };

  onMouseOverNode = function(nodeId: any) {
    window.alert(`Mouse over node ${nodeId}`);
  };

  onMouseOutNode = function(nodeId: any) {
    window.alert(`Mouse out node ${nodeId}`);
  };

  onClickLink = function(source: any, target: any) {
    window.alert(`Clicked link between ${source} and ${target}`);
  };

  onRightClickLink = function(event: any, source: any, target: any) {
    window.alert(`Right clicked link between ${source} and ${target}`);
  };

  onMouseOverLink = function(source: any, target: any) {
    window.alert(`Mouse over in link between ${source} and ${target}`);
  };

  onMouseOutLink = function(source: any, target: any) {
    window.alert(`Mouse out link between ${source} and ${target}`);
  };

  onNodePositionChange = function(nodeId: any, x: any, y: any) {
    window.alert(
      `Node ${nodeId} is moved to new position. New position is x= ${x} y= ${y}`
    );
  };

  render() {
    return (
      <Graph
        className={Classes.DARK}
        id="graph-id" // id is mandatory, if no id is defined rd3g will throw an error
        data={this.data}
        config={this.myConfig}
        onClickNode={this.onClickNode}
        onRightClickNode={this.onRightClickNode}
        onClickGraph={this.onClickGraph}
        onClickLink={this.onClickLink}
        onRightClickLink={this.onRightClickLink}
        // onMouseOverNode={this.onMouseOverNode}
        // onMouseOutNode={this.onMouseOutNode}
        // onMouseOverLink={this.onMouseOverLink}
        // onMouseOutLink={this.onMouseOutLink}
        onNodePositionChange={this.onNodePositionChange}
      />
    );
  }
}

export default NetworkGraph;
