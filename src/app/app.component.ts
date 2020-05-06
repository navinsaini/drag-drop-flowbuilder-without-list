import {
  Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, Renderer2,
  ViewChildren, QueryList
} from '@angular/core';
import { CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';

enum mouseButtons {
  none = 0,
  left = 1,
  right = 2
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  isGraphStable = false;
  transformInteractiveZoneClassName = "transform-interactive-zone";
  transformParams: any = {
    scale: 1,
    dx: 0,
    dy: 0,
    isTranslating: false
  }
  translateStartX: any = 0;
  translateStartY: any = 0;
  transformScale: any = 0;

  records: any = [];
  displayRecords: any = [];

  connectToItem: any = null;

  @ViewChild('transformableElm', { static: false }) transformableViewRef: ElementRef;
  @ViewChild('rootElm', { static: false }) viewRootElement: ElementRef;
  @ViewChild('boundryElm', { static: false }) contentBoundaryElement: ElementRef;
  @ViewChild('targetElm', { static: false }) transformTargetElement: ElementRef;
  @ViewChild('boundryCornerElm', { static: false }) boundryCornerElement: ElementRef;
  @ViewChildren('allNodes') allNodes: QueryList<any>;

  svgElements: any;
  constructor(
    private cd: ChangeDetectorRef,
    private renderer: Renderer2
  ) {

  }

  ngOnInit() {

  }

  initData() {
    // this.addNewRecord(null);
    this.records = [{ "id": "1588679756965", "connectedTo": null, "title": "Record 1", "width": "300px", "height": "100px", "left": 374, "top": 111 }, { "id": "1588680078075", "connectedTo": "1588679756965", "title": "Record 2", "width": "300px", "height": "100px", "left": 352, "top": 383 }];
    this.onDisplayRecords();
  }

  addNewRecord(connectedTo) {
    let height = 100;// Math.floor(Math.random() * (300 - 150 + 1) + 150);
    this.records.push({
      id: new Date().getTime().toString(),
      connectedTo: connectedTo ? connectedTo.toString() : connectedTo,
      title: "Record " + (this.records.length + 1),
      width: '300px',
      height: `${height}px`,
      left: this.getLeftPosition(connectedTo),
      top: this.getTopPosition(connectedTo)
    })
    this.onDisplayRecords();
  }

  onAddNew(id) {
    this.addNewRecord(id);
  }

  onDeleteNode(id) {
    let index = -1;
    for (var i = 0; i < this.records.length; i++) {
      if (this.records[i].id === id) {
        index = i;
        break;
      }
    }
    if (index >= 0) {
      //attach connected records to parent record of deleted record
      let record = this.records[index];
      let pIndex = this.records.findIndex(item => item.id == record.connectedTo);
      let records = this.records.filter(item => item.connectedTo === record.id);
      if (pIndex >= 0) {
        records.forEach(item => {
          item.connectedTo = this.records[pIndex].id;
        });
      } else {
        records.forEach(item => {
          item.connectedTo = null;
        });
      }

      //remove record from array
      for (var i = 0; i < records.length; i++) {
        let _index = this.records.findIndex(item => item.id === records[i].id);
        this.records.splice(_index, 1);
      }
      this.records.splice(index, 1, ...records);
      this.onDisplayRecords();
    }
  }

  onDisplayRecords() {
    let displayRecords = [];
    this.cd.detectChanges();
    let { scrollLeft, scrollTop } = this.viewRootElement.nativeElement;

    var recordsObj = {};
    const defaultKey = "initial";
    if (this.records.length) {
      this.records.forEach(record => {
        let connectedTo = record.connectedTo === null ? defaultKey : record.connectedTo;
        if (recordsObj.hasOwnProperty(connectedTo)) {
          recordsObj[connectedTo].push(record);
        } else {
          recordsObj[connectedTo] = [record];
        }
      })

      displayRecords.push(recordsObj[defaultKey]);
      for (var i = 0; i < displayRecords.length; i++) {
        for (var j = 0; j < displayRecords[i].length; j++) {
          var record = displayRecords[i][j];
          let _records = recordsObj[record.id];
          if (_records && _records.length) {
            const next = i + 1;
            if (displayRecords[next]) {
              displayRecords[next] = [...displayRecords[next], ..._records];
            } else {
              displayRecords.push(_records);
            }
          }
        }
      }
    }
    this.displayRecords = displayRecords;

    this.cd.detectChanges();
    this.viewRootElement.nativeElement.scrollLeft = scrollLeft;
    this.viewRootElement.nativeElement.scrollTop = scrollTop;
    this.cd.detectChanges();
    this.fnRenderEdges();
  }

  ngAfterViewInit() {
    this.allNodes.changes.subscribe(() => {
      this.fnRenderEdges();
    })
    this.initData();
    this.onPageLoad();
  }

  edgeTimer: any;
  fnRenderEdges() {
    let component = this;
    clearTimeout(component.edgeTimer);
    component.edgeTimer = setTimeout(function () {
      if (component.svgElements) {
        component.renderer.removeChild(component.transformTargetElement.nativeElement, component.svgElements);
        component.svgElements = null;
      }
      component.renderEdges();
    }, 0)
  }

  renderEdges() {
    let { scrollLeft, scrollTop } = this.viewRootElement.nativeElement;
    this.svgElements = this.renderer.createElement("div");
    this.renderer.appendChild(this.transformTargetElement.nativeElement, this.svgElements);
    var nodes = this.allNodes.toArray();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i].nodeProps;
      const sPosition = this.getEdgeStartPosition(nodes, i);
      const ePosition = this.getEdgeEndPosition(nodes, i);
      const sx = (scrollLeft + sPosition.left + (sPosition.width / 2)) / this.transformParams.scale;
      const sy = (scrollTop + sPosition.top + sPosition.height) / this.transformParams.scale;
      if (ePosition) {
        const ex = (scrollLeft + ePosition.left + (ePosition.width / 2)) / this.transformParams.scale;
        const ey = (scrollTop + ePosition.top) / this.transformParams.scale;

        if ((ey - 20) < sy) {
          this.renderBlockLine(sx, sy, ex, ey, node);
        } else if (sx === ex) {
          this.renderStraightLine(sx, sy, ex, ey, node);
        } else {
          this.renderCurveLine(sx, sy, ex, ey, node);
        }
      }
      this.renderBoundaryCorner();
    }
  }

  getEdgeStartPosition(nodes, index) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[index].nodeProps.connectedTo == nodes[i].nodeProps.id) {
        return nodes[i].el.nativeElement.getBoundingClientRect();
      }
    }
    return nodes[index].el.nativeElement.getBoundingClientRect();
  }

  getEdgeEndPosition(nodes, index) {
    if (nodes[index].nodeProps.connectedTo != null) {
      return nodes[index].el.nativeElement.getBoundingClientRect();
    }
  }

  renderBlockLine(sx, sy, ex, ey, node) {
    var lx = ex + (ex < sx ? -170 : 170);
    var path = `M${sx},${sy} L${sx},${sy + 130} L${lx},${sy + 130} L${lx},${ey - 50} L${ex},${ey - 50} ${ex},${ey}`;
    this.renderPath(path, node, false)
  }

  renderStraightLine(sx, sy, ex, ey, node) {
    var path = `M${sx},${sy} L${ex},${ey}`;
    this.renderPath(path, node, false)
  }

  renderCurveLine(sx, sy, ex, ey, node) {
    var cy = sy + (ey - sy) / 2;
    var path = `M${sx},${sy} C${sx},${cy} ${ex},${cy} ${ex},${ey - 10} T${ex},${ey}`;
    this.renderPath(path, node, false)
  }

  renderPath(path, node, midPoint) {
    // let color = "gray";
    const svg = this.renderer.createElement("svg", "svg");
    this.renderer.setAttribute(svg, "class", "paths");
    this.renderer.setAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
    this.renderer.setAttribute(svg, "id", node.id);
    this.renderer.setAttribute(svg, "connectedTo", node.connectedTo);

    const svgPath = this.renderer.createElement('path', 'svg');
    this.renderer.setAttribute(svgPath, "class", 'path');
    this.renderer.setAttribute(svgPath, "d", path);
    // this.renderer.setAttribute(svgPath, "stroke", color);
    this.renderer.setAttribute(svgPath, "strokeWidth", "2");
    this.renderer.setAttribute(svgPath, "fill", "none");
    this.renderer.setAttribute(svgPath, "marker-start", `url(#circle-${node.id})`);
    this.renderer.setAttribute(svgPath, "marker-end", `url(#arrow-${node.id})`);
    if (midPoint)
      this.renderer.setAttribute(svgPath, "marker-mid", `url(#circle-${node.id})`);

    const markerCircle = this.renderer.createElement("marker", "svg");
    this.renderer.setAttribute(markerCircle, "id", `circle-${node.id}`);
    this.renderer.setAttribute(markerCircle, "markerWidth", "10");
    this.renderer.setAttribute(markerCircle, "markerHeight", "10");
    this.renderer.setAttribute(markerCircle, "refX", "5");
    this.renderer.setAttribute(markerCircle, "refY", "5");

    const circle = this.renderer.createElement("circle", "svg");
    this.renderer.setAttribute(circle, "class", 'circle');
    this.renderer.setAttribute(circle, "r", "5");
    this.renderer.setAttribute(circle, "cx", "5");
    this.renderer.setAttribute(circle, "cy", "5");
    this.renderer.setAttribute(circle, "stroke", "none");
    // this.renderer.setAttribute(circle, "fill", color);

    const defs = this.renderer.createElement("defs", "svg");

    const markerArrow = this.renderer.createElement("marker", "svg");
    this.renderer.setAttribute(markerArrow, "id", `arrow-${node.id}`);
    this.renderer.setAttribute(markerArrow, "orient", "auto");
    this.renderer.setAttribute(markerArrow, "markerUnits", "strokeWidth");
    this.renderer.setAttribute(markerArrow, "markerWidth", "10");
    this.renderer.setAttribute(markerArrow, "markerHeight", "10");
    this.renderer.setAttribute(markerArrow, "refX", "10");
    this.renderer.setAttribute(markerArrow, "refY", "5");

    const markerPath = this.renderer.createElement("path", "svg");
    this.renderer.setAttribute(markerPath, "d", "M0,0 L0,10 L10,5 z");
    this.renderer.setAttribute(markerArrow, "class", 'arrow');
    // this.renderer.setAttribute(markerPath, "fill", color);

    this.renderer.appendChild(markerCircle, circle);
    this.renderer.appendChild(svg, markerCircle);

    this.renderer.appendChild(markerArrow, markerPath);
    this.renderer.appendChild(defs, markerArrow);
    this.renderer.appendChild(svg, defs);

    this.renderer.appendChild(svg, svgPath);

    this.renderer.appendChild(this.svgElements, svg);
    this.cd.detectChanges();
  }

  onDropEnd(event: CdkDragEnd<any>) {
    let left = event.source.data.left + event.distance.x;
    let top = event.source.data.top + event.distance.y;
    event.source.data.left = left;
    event.source.data.top = top;
  }

  onDragMove(event: CdkDragMove<any>) {
    this.fnRenderEdges();
  }

  showConnectTo(item) {
    this.connectToItem = item;
  }
  onConnectItem(value) {
    if (value) {
      let index = this.records.findIndex(obj => obj.id == this.connectToItem.id);
      this.records[index]["connectedTo"] = value;
      this.connectToItem = null;
      this.onDisplayRecords();
    } else {
      this.connectToItem = null;
    }
  }

  getLeftPosition(connectedTo) {
    let left = 100;
    return left;
  }

  getTopPosition(connectedTo) {
    let top = 100;
    return top;
  }

  getMaxWidth() {
    let maxWidth = 0;
    var nodes = this.allNodes.toArray();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var { left, width } = node.el.nativeElement.getBoundingClientRect();
      if (maxWidth < (left + width)) {
        maxWidth = left + width + 100;
      }
    }
    let clientWidth = this.viewRootElement.nativeElement.clientWidth - 1;
    maxWidth = maxWidth < clientWidth ? clientWidth : maxWidth;
    return maxWidth;
  }

  getMaxHeight() {
    let maxHeight = 0;
    var nodes = this.allNodes.toArray();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var { top, height } = node.el.nativeElement.getBoundingClientRect();
      if (maxHeight < (top + height)) {
        maxHeight = top + height + 100;
      }
    }
    let clientHeight = this.viewRootElement.nativeElement.clientHeight - 1;
    maxHeight = maxHeight < clientHeight ? clientHeight : maxHeight;
    return maxHeight;
  }

  renderBoundaryCorner() {
    let maxWidth = this.getMaxWidth();
    let maxHeight = this.getMaxHeight();
    const nativeElement = this.boundryCornerElement.nativeElement;
    this.renderer.setStyle(nativeElement, "left", `${maxWidth}px`);
    this.renderer.setStyle(nativeElement, "top", `${maxHeight}px`);
    this.cd.detectChanges();
    this.updateView();
  }

  onPageLoad() {
    this.updateView();
    this.debouncedUpdate();
  }

  handleButtonAction(type) {
    switch (type) {
      case 'ADDNEW':
        this.addNewRecord(null)
        break;
      case 'ZOOMIN':
        this.handleZoomIn();
        break;
      case 'RECENTER':
        this.handleZoomPanReset();
        break;
      case 'ZOOMOUT':
        this.handleZoomOut();
        break;
    }
  }

  handleZoomIn() {
    this.updateScale(.1);
  }

  handleZoomOut() {
    this.updateScale(-.1);
  }

  handleZoomPanReset() {
    this.resetPanAndZoom();
  }

  handleMouseDown(e) {
    this.translateStartX = e.clientX;
    this.translateStartY = e.clientY;

    if (this.canTranslateTarget(e)) {
      this.translateStartX = e.clientX;
      this.translateStartY = e.clientY
      this.setTranslationState(true);
    }
  }

  handleMouseMove(e) {
    if (this.transformParams.isTranslating) {
      if (e.buttons === mouseButtons.left) {
        e.preventDefault();
        this.transformParams.dx = this.translateStartX - e.clientX;
        this.transformParams.dy = this.translateStartY - e.clientY;
        this.translateStartX = e.clientX;
        this.translateStartY = e.clientY;
        this.updateView();
      } else {
        this.setTranslationState(false)
      }
    }
  }

  handleMouseUp(e) {
    this.setTranslationState(false);
  }

  handleMouseWheel(e) {
    if (e.ctrlKey) {
      e.preventDefault()
      this.updateScale(e.deltaY > 0 ? -.1 : .1);
    }
  }

  initTransformParams() {
    this.transformParams = {
      scale: 1,
      dx: 0,
      dy: 0,
      isTranslating: false
    }
    this.translateStartX = 0;
    this.translateStartY = 0;
    this.onScaleChanged(1)
  }

  updateScale(scale) {
    var _scale = this.transformParams.scale + scale;
    if (_scale >= .2 && _scale <= 3) {
      this.transformParams.scale = _scale;
      this.updateView();
      this.onScaleChanged(_scale);
    }
  }

  resetPanAndZoom() {
    this.initTransformParams();
    this.updateView();
  }

  onScaleChanged(scale) {
    this.transformScale = scale;
  }

  canTranslateTarget = function (e) {
    let component = this;
    var t = e.target,
      n = [];
    return "string" == typeof t.className && (n = t.className.split(" ")), n.some((function (e) {
      return e === component.transformInteractiveZoneClassName;
    }))
  }

  setTranslationState(isTranslating) {
    this.transformParams.dx = 0;
    this.transformParams.dy = 0;
    this.transformParams.isTranslating = isTranslating;
    if (isTranslating) {
      this.viewRootElement.nativeElement.classList.add("transform-translating");
    } else {
      this.viewRootElement.nativeElement.classList.remove("transform-translating");
    }
  }

  updateView() {
    this.updateTransformTarget();
    this.updateContentBoundary();
    this.updateViewRoot();
  }

  updateTransformTarget() {
    this.transformTargetElement.nativeElement.style.transformOrigin = "left top";
    this.transformTargetElement.nativeElement.style.transform = "scale(" + this.transformParams.scale + ")";
    this.cd.detectChanges();
  }

  updateContentBoundary() {
    let width = this.transformTargetElement.nativeElement.scrollWidth * this.transformParams.scale;
    let height = this.transformTargetElement.nativeElement.scrollHeight * this.transformParams.scale;
    this.contentBoundaryElement.nativeElement.style.width = width + "px";
    this.contentBoundaryElement.nativeElement.style.height = height + "px";
    this.cd.detectChanges();
  }

  updateViewRoot() {
    this.viewRootElement.nativeElement.scrollLeft += this.transformParams.dx;
    this.viewRootElement.nativeElement.scrollTop += this.transformParams.dy;
    this.cd.detectChanges();
  }


  debouncedUpdate() {
    this.isGraphStable = true;
    this.cd.detectChanges();
  }

  getSortedIncomingEdgeIds(id) {
    return [];
  }
}
