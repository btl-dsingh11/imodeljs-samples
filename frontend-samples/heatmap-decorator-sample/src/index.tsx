/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Id64String } from "@bentley/bentleyjs-core";
import { App, GithubLink, PointSelector, SampleBaseApp, SampleContext, SampleUIProvider, ViewportAndNavigation } from "@bentley/frontend-sample-base";
import "@bentley/frontend-sample-base/src/SampleBase.scss";
import { Point3d, Range2d } from "@bentley/geometry-core";
import "@bentley/icons-generic-webfont/dist/bentley-icons-generic-webfont.css";
import { ColorDef } from "@bentley/imodeljs-common";
import { IModelApp, IModelAppOptions, IModelConnection, StandardViewId, Viewport } from "@bentley/imodeljs-frontend";
import { Toggle } from "@bentley/ui-core";
import * as React from "react";
import * as ReactDOM from "react-dom";
import HeatmapDecorator from "./HeatmapDecorator";

/** This file contains the user interface and main logic that is specific to this sample. */

/** React state of the Sample component */
interface SampleState {
  range?: Range2d;
  showDecorator: boolean;
  spreadFactor: number;
}

/** A React component that renders the UI specific for this sample */
export class Sample extends React.Component<{}, SampleState> {
  private _heatmapDecorator?: HeatmapDecorator;
  private _height?: number;

  /** Creates an Sample instance */
  constructor(props?: any, context?: any) {
    super(props, context);
    this.state = {
      showDecorator: true,
      spreadFactor: 10,
    };

    IModelApp.viewManager.onViewOpen.addOnce((vp: Viewport) => {
      if (vp.view.is3d()) {
        // To make the heatmap look better, lock the view to a top orientation with camera turned off.
        vp.view.setAllow3dManipulations(false);
        vp.view.turnCameraOff();
        vp.setStandardRotation(StandardViewId.Top);
      }

      // We'll draw the heatmap as an overlay in the center of the view's Z extents.
      const range = vp.view.computeFitRange();
      this._height = range.high.interpolate(0.5, range.low).z;

      vp.view.lookAtVolume(range, vp.viewRect.aspect);
      vp.synchWithView(false);

      // The heatmap looks better against a white background.
      const style = vp.displayStyle.clone();
      style.backgroundColor = ColorDef.white;
      vp.displayStyle = style;

      // Grab the range of the contents of the view. We'll use this to size the heatmap.
      const range2d = Range2d.createFrom(range);
      this.setState({ range: range2d, showDecorator: true });
    });
  }

  /** This method is called as the app initializes.  This gives us a chance to supply options to
   * be passed to IModelApp.startup.
   */
  public static getIModelAppOptions(): IModelAppOptions {
    // This sample doesn't supply any special options.
    return {};
  }

  private setupHeatmapDecorator(points: Point3d[]) {
    this._heatmapDecorator = new HeatmapDecorator(points, this.state.range!, this.state.spreadFactor, this._height!);
    this.showDecorations();
  }

  private showDecorations() {
    if (this._heatmapDecorator)
      IModelApp.viewManager.addDecorator(this._heatmapDecorator);
  }

  private teardownHeatmapDecorator() {
    if (undefined === this._heatmapDecorator)
      return;

    IModelApp.viewManager.dropDecorator(this._heatmapDecorator);
  }

  private _onPointsChanged = (points: Point3d[]) => {
    if (undefined === this._heatmapDecorator) {
      this.setupHeatmapDecorator(points);
      return;
    }

    this._heatmapDecorator.setPoints(points);
  }

  private _onChangeSpreadFactor = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ spreadFactor: Number(event.target.value) }, () => {
      if (undefined !== this._heatmapDecorator)
        this._heatmapDecorator.setSpreadFactor(this.state.spreadFactor);
    });
  }

  private _onChangeShowHeatmap = (checked: boolean) => {
    if (checked) {
      this.setState({ showDecorator: true }, () => this.showDecorations());
    } else {
      this.setState({ showDecorator: false }, () => this.teardownHeatmapDecorator());
    }
  }

  /** The sample's render method */
  public render() {
    return (
      <>
        { /* This is the ui specific for this sample.*/}
        <div className="sample-ui">
          <div className="sample-instructions">
            <span>Use the options below to control the heatmap visualization.</span>
            <GithubLink linkTarget="https://github.com/imodeljs/imodeljs-samples/tree/master/frontend-samples/heatmap-decorator-sample" />
          </div>
          <hr></hr>
          <div className="sample-options-2col">
            <span>Show Heatmap</span>
            <Toggle isOn={this.state.showDecorator} onChange={this._onChangeShowHeatmap} />
            <PointSelector onPointsChanged={this._onPointsChanged} range={this.state.range} />
            <span>Spread Factor</span>
            <input type="range" min="1" max="100" value={this.state.spreadFactor} onChange={this._onChangeSpreadFactor}></input>
          </div>
        </div>
      </>
    );
  }
}

/*
 * From here down is boiler plate common to all front-end samples.
 *********************************************************************************************/

/** React props for Sample component */
interface SampleProps {
  imodel: IModelConnection;
  viewDefinitionId: Id64String;
}

/** A React component that renders the UI for the sample */
export class SampleContainer extends React.Component<SampleProps> {

  /** The sample's render method */
  public render() {
    return (
      <>
        <ViewportAndNavigation imodel={this.props.imodel} viewDefinitionId={this.props.viewDefinitionId} />
        <Sample />
      </>
    );
  }
}

(async () => {
  // initialize the application
  const uiProvider: SampleUIProvider = { getSampleUI: (context: SampleContext) => < SampleContainer imodel={context.imodel} viewDefinitionId={context.viewDefinitionId} /> };
  await SampleBaseApp.startup(uiProvider, Sample.getIModelAppOptions());

  // when initialization is complete, render
  ReactDOM.render(
    <App />,
    document.getElementById("root") as HTMLElement,
  );
})(); // tslint:disable-line:no-floating-promises
