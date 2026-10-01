import type { JSONContent } from '@tiptap/react';
export const sample: JSONContent = { type: 'doc', content: [
 { type: 'paragraph', content: [{type:'text',text:'ALGÈBRE · CHAPITRE 03',marks:[{type:'textStyle',attrs:{color:'#708478'}}]}] },
 { type: 'heading', attrs: {level:2}, content: [{type:'text',text:'D’une somme à une formule'}]},
 { type: 'paragraph', content: [{type:'text',text:'On considère la somme suivante. Comment trouver une expression simple, quel que soit le nombre de termes ?'}]},
 { type: 'mathBlock', attrs: {latex:'S_n = \\sum_{k=1}^{n} 3^{2k-1}'}},
 { type: 'paragraph', content: [{type:'text',text:'Puisque '},{type:'inlineMath',attrs:{latex:'3^{2k} = 9^k'}},{type:'text',text:', on reconnaît une suite géométrique de raison '},{type:'inlineMath',attrs:{latex:'q = 9'}},{type:'text',text:'. Il suffit alors de réécrire la somme.'}]},
 { type: 'heading', attrs: {level:2}, content:[{type:'text',text:'Dérouler le raisonnement'}]},
 { type:'mathBlock',attrs:{latex:'\\begin{aligned}\n\\sum_{k=1}^{n}3^{2k-1}\n&= \\frac{1}{3}\\sum_{k=1}^{n}9^k \\\\\n&= \\frac{1}{3}\\frac{9(9^n-1)}{8} \\\\\n&= \\frac{3(9^n-1)}{8}.\n\\end{aligned}'}},
 {type:'callout',content:[{type:'paragraph',content:[{type:'text',text:'À retenir. ',marks:[{type:'bold'}]},{type:'text',text:'La bonne transformation rend une somme compliquée familière.'}]}]},
 {type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'Identifier le premier terme et la raison.'}]}]},{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'Vérifier la formule pour n = 1.'}]}]}]},
 {type:'heading',attrs:{level:2},content:[{type:'text',text:'Une intuition graphique'}]},
 {type:'paragraph',content:[{type:'text',text:'Explorer une fonction : faites glisser le repère ou zoomez pour observer son comportement.'}]},
 {type:'graph',attrs:{expressions:['x^2'],xMin:-5,xMax:5,height:320}},
 {type:'paragraph'}
]};
