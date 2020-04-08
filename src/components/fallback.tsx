import * as React from "react";
import { Classes, Callout, Intent } from "@blueprintjs/core";
import { ROUTES } from "../utils/utils";
import { RouteComponentProps } from "react-router";

class Fallback extends React.Component<RouteComponentProps> {
  isExistingPath() {
    const regex = new RegExp(
      "^/dashboard/(assets|models|datacenters|racks|bulk-upload|change-plans)|^/dashboard$"
    );
    if (regex.exec(this.props.location.pathname)) {
      return true;
    }
    return Object.values(ROUTES).some(
      (v) => v === this.props.location.pathname
    );
  }
  render() {
    return this.isExistingPath() ? null : NotFound;
  }
}
export const NotFound = (
  <Callout intent={Intent.WARNING}>
    <h4 className={Classes.DARK}>
      The page that you are looking for does not exist!
    </h4>
  </Callout>
);

export const NotAuthorized = () => {
  return (
    <Callout intent={Intent.WARNING}>
      <h4 className={Classes.DARK}>Please log in to see this page</h4>
    </Callout>
  );
};

export const NotAuthorizedAdmin = () => {
  return (
    <Callout intent={Intent.WARNING}>
      <h4 className={Classes.DARK}>
        You are not authorized to view this page.
      </h4>
    </Callout>
  );
};

export default Fallback;
