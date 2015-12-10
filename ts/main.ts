import { Graph, Node } from './graph';

const gr = new Graph(<HTMLCanvasElement>$('#graph-canvas')[0]);

const tmp = $('<div>').addClass('arrow');
$('body').append(tmp);
gr.arrowColor = tmp.css('color');
tmp.remove();

const n1 = new Node(10, 10);
const n2 = new Node(30, 100);
const n3 = new Node(60, 200);
n1.addInput(n2);
n2.addInput(n3);
gr.addNode(n1);
gr.addNode(n2);
gr.addNode(n3);

gr.draw();

$('.node').draggable({
	containment: 'parent',
	cursor: 'move',
	distance: 5,
	stack: '.node',
	drag(event, ui) {
		const n = ui.helper.data('node');
		n.x = ui.position.left;
		n.y = ui.position.top;
		gr.draw();
	}
});