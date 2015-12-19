export class SynthUI {
	gr: Graph;
	synth: Synth;

	constructor(graphCanvas: HTMLCanvasElement, jqParams: JQuery) {
		this.gr = new Graph(graphCanvas);
		this.gr.handler = new SynthGraphHandler(jqParams);
		this.synth = new Synth();
		this.setArrowColors();
		this.registerPaletteHandler();
		this.addOutputNode();
	}

	addOutputNode() {
		//TODO avoid using hardcoded position
		const out = new Node(500, 180, 'Out');
		const data = new NodeData();
		out.data = data;
		data.anode = this.synth.ac.destination;
		data.nodeDef = this.synth.palette['Speaker'];
		this.gr.addNode(out);
	}

	registerPaletteHandler() {
		var self = this;	// JQuery sets 'this' in event handlers
		$('.palette > .node').click(function(evt) {
			const elem = $(this);
			const n = new Node(260, 180, elem.text());
			const data = new NodeData();
			n.data = data;
			const type = elem.attr('data-type');
			data.anode = self.synth.createAudioNode(type);
			data.nodeDef = self.synth.palette[type];
			self.gr.addNode(n, data.nodeDef.control ? 'node-ctrl' : undefined);
			if (!data.anode) {
				console.warn(`No AudioNode found for '${type}'`);
				n.element.css('background-color', '#BBB');
			}
			else {
				if (data.anode['start']) data.anode['start']();
			}
		});
	}

	setArrowColors() {
		const arrowColor = this.getCssFromClass('arrow', 'color');
		const ctrlArrowColor = this.getCssFromClass('arrow-ctrl', 'color');
		const originalDrawArrow = this.gr.graphDraw.drawArrow;
		this.gr.graphDraw.drawArrow = function(srcNode: Node, dstNode: Node) {
			const srcData: NodeData = srcNode.data;
			this.arrowColor = srcData.nodeDef.control ? ctrlArrowColor : arrowColor;
			originalDrawArrow.bind(this)(srcNode, dstNode);
		}
	}

	getCssFromClass(className, propName) {
		const tmp = $('<div>').addClass(className);
		$('body').append(tmp);
		const propValue = tmp.css(propName);
		tmp.remove();
		return propValue;
	}
}


export class NodeData {
	anode: ModernAudioNode;
	nodeDef: NodeDef;
	// Used by control nodes only
	controlParam: string;
	controlParams: string[];
	controlTarget: ModernAudioNode;
}


//-------------------- Privates --------------------

import { Graph, Node, GraphHandler } from './graph';
import { Synth, NodeDef } from './synth';
import { renderParams } from './paramsUI';

class SynthGraphHandler implements GraphHandler {

	jqParams: JQuery;

	constructor(jqParams) {
		this.jqParams = jqParams;
	}

	canBeSource(n: Node): boolean {
		const data: NodeData = n.data;
		return data.anode.numberOfOutputs > 0;
	}

	canConnect(src: Node, dst: Node): boolean {
		const srcData: NodeData = src.data;
		const dstData: NodeData = dst.data;
		//TODO even if src node is control, should not connect to Speaker output
		if (srcData.nodeDef.control) return true;
		return dstData.anode.numberOfInputs > 0;
	}

	connected(src: Node, dst: Node): void {
		const srcData: NodeData = src.data;
		const dstData: NodeData = dst.data;
		if (srcData.nodeDef.control && !dstData.nodeDef.control) {
			srcData.controlParams = Object.keys(dstData.nodeDef.params)
				.filter(pname => dstData.anode[pname] instanceof AudioParam);
			srcData.controlParam = srcData.controlParams[0];
			srcData.controlTarget = dstData.anode;
			srcData.anode.connect(dstData.anode[srcData.controlParam]);
			//TODO update params box in case selected node is src
		}
		else srcData.anode.connect(dstData.anode);
	}

	disconnected(src: Node, dst: Node): void {
		const srcData: NodeData = src.data;
		const dstData: NodeData = dst.data;
		if (srcData.nodeDef.control && !dstData.nodeDef.control) {
			srcData.controlParams = null;
			srcData.anode.disconnect(dstData.anode[srcData.controlParam]);
		}
		else //TODO test fan-out
			srcData.anode.disconnect(dstData.anode);
	}

	nodeSelected(n: Node): void {
		const data: NodeData = n.data;
		renderParams(data, this.jqParams);
	}
}


interface ModernAudioNode extends AudioNode {
	disconnect(output?: number | AudioNode | AudioParam): void
}
