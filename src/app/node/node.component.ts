import {
    Component, OnInit, AfterViewInit, Input, ElementRef, Output,
    EventEmitter, OnChanges, ChangeDetectorRef, Renderer2, SimpleChange
} from '@angular/core';

@Component({
    selector: 'app-node',
    templateUrl: './node.component.html',
    styleUrls: ['./node.component.scss']
})
export class NodeComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() nodeProps: any;
    @Output() onAddNew = new EventEmitter();
    @Output() onDeleteNode = new EventEmitter();

    constructor(private el: ElementRef,
        private cd: ChangeDetectorRef,
        private renderer: Renderer2) {

    }

    ngOnInit() {
        this.cd.detectChanges();

    }
    ngAfterViewInit() {
        this.cd.detectChanges();
    }

    ngOnChanges(changes: { [propName: string]: SimpleChange }) {
        this.updateNodeLayout();
    }

    updateNodeLayout() {
        const nativeElement = this.el.nativeElement;
        const left = this.nodeProps.left;
        const top = this.nodeProps.top;
        this.renderer.setStyle(nativeElement, "left", `${left}px`);
        this.renderer.setStyle(nativeElement, "top", `${top}px`);
    }

    addNewBlock() {
        this.onAddNew.emit(this.nodeProps.id);
    }

    deleteBlock() {
        this.onDeleteNode.emit(this.nodeProps.id);
    }

}