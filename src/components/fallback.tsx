import * as React from "react";
import { Classes, Callout, Intent } from "@blueprintjs/core";
import { RouteComponentProps } from "react-router";

export class NotFound extends React.Component<RouteComponentProps> {
  render() {
    return (
      <Callout intent={Intent.WARNING}>
        <h4 className={Classes.DARK}>
          The page that you are looking for does not exist!
        </h4>
      </Callout>
    );
  }
}

export const NotAuthorized = () => (
  <Callout intent={Intent.WARNING}>
    <h4 className={Classes.DARK}>Please log in to see this page</h4>
  </Callout>
);

export const NotAuthorizedAdmin = () => (
  <Callout intent={Intent.WARNING}>
    <h4 className={Classes.DARK}>You are not authorized to view this page.</h4>
  </Callout>
);
