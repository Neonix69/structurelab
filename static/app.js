const $=id=>document.getElementById(id);let apiKey='',model='openai/gpt-oss-120b',history=[],busy=false,practiceStats=[],selectedAnswer=null,currentRole=null,adaptiveDifficulty='Beginner';const concepts=['Arrays','Stacks','Queues','Singly Linked Lists','Circular Linked Lists','Doubly Linked Lists','Trees','Graphs','Heaps / Priority Queues','Hashing'];
function showPage(name){if(name==='teacher'&&!['teacher','admin'].includes(currentRole))return;document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));$('page-'+name).classList.add('active-page');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));$('crumb').textContent=({tutor:'AI Tutor',dashboard:'Overview',visual:'Visual playground',practice:'Practice lab',progress:'My progress',teacher:'Teacher workspace'})[name];if(name==='visual')renderModel();if(name==='practice')loadQuestion();if(name==='teacher')loadTeacherAnalytics();}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>showPage(b.dataset.goto));$('openSettings').onclick=()=>{if(['teacher','admin'].includes(currentRole))$('settingsModal').classList.remove('hidden')};if($('teacherOpenSettings'))$('teacherOpenSettings').onclick=()=>$('settingsModal').classList.remove('hidden');$('closeSettings').onclick=()=>$('settingsModal').classList.add('hidden');$('settingsModal').onclick=e=>{if(e.target===$('settingsModal'))$('settingsModal').classList.add('hidden')};$('focusToggle').onclick=()=>document.body.classList.toggle('focus-mode');if($('textSizeToggle'))$('textSizeToggle').onclick=()=>document.body.classList.toggle('large-text');if($('motionToggle'))$('motionToggle').onclick=()=>document.body.classList.toggle('reduced-motion');
function setConnected(yes,text=''){['statusDot','chatDot'].forEach(id=>$(id).classList.toggle('on',yes));$('statusText').textContent=yes?'AI ready':'AI unavailable';$('chatStatus').textContent=yes?'Ready to help':'Waiting for AI setup';$('dashAI').textContent=yes?'On':'Off';$('dashAIText').textContent=yes?'AI service ready':'Ask your teacher to configure AI';if($('teacherAIStatus'))$('teacherAIStatus').textContent=yes?'Connected':'Not connected';$('connectionHelp').textContent=yes?'AI tutor is ready to use.':'Ask your teacher to configure the AI service.';if(text)toast(text)}function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),3000)}
$('testConnection').onclick=async()=>{apiKey=$('apiKey').value.trim();model=$('modelSelect').value;const box=$('connectionMessage');box.className='connection-message';box.textContent='Testing your Groq connection…';box.classList.remove('hidden');$('testConnection').disabled=true;try{const r=await fetch('/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:apiKey,model})});const d=await r.json();if(d.ok){box.classList.add('success');box.textContent='✓ '+d.message+' Model: '+d.model;setConnected(true);apiKey='';$('apiKey').value='';setTimeout(()=>$('settingsModal').classList.add('hidden'),800)}else{box.classList.add('error');box.textContent='Connection failed\n'+d.error;setConnected(false)}}catch(e){box.classList.add('error');box.textContent='Could not reach the local app server. Close and restart start_app.bat.'}finally{$('testConnection').disabled=false}};
let voiceRepliesEnabled=true;try{voiceRepliesEnabled=localStorage.getItem('dsw_voice_replies')!=='off'}catch(e){}
let speechRunId=0;
function cleanTextForSpeech(input){
 let s=String(input??'').replace(/\r\n?/g,'\n');
 // Don't read code aloud as punctuation soup.
 s=s.replace(/```[\s\S]*?```/g,' The code example is displayed on screen. ');
 s=s.replace(/`([^`]+)`/g,'$1');
 // Markdown tables: speak the cell contents, not pipes or separator dashes.
 s=s.split('\n').filter(line=>{
  const t=line.trim();
  if(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(t))return false;
  if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(t))return false;
  return true;
 }).map(line=>{
  let t=line.trim();
  if(t.includes('|'))t=t.replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim()).filter(Boolean).join('. ');
  t=t.replace(/^#{1,6}\s+/,'');
  t=t.replace(/^\s*>\s?/,'');
  t=t.replace(/^\s*[-*+]\s+/,'');
  t=t.replace(/^\s*\d+[.)]\s+/,'');
  return t;
 }).join('\n');
 s=s.replace(/!?\[([^\]]+)\]\([^)]+\)/g,'$1');
 s=s.replace(/https?:\/\/\S+/g,'');
 s=s.replace(/\*\*(.*?)\*\*/g,'$1').replace(/__(.*?)__/g,'$1').replace(/\*(.*?)\*/g,'$1').replace(/_(.*?)_/g,'$1');
 // Replace symbols commonly spoken as “dash, dash, dash” with natural pauses.
 s=s.replace(/[—–―−]/g,', ').replace(/\s-\s/g,', ');
 s=s.replace(/[|*_`#>~]/g,' ');
 s=s.replace(/[•▪◦]/g,' ');
 s=s.replace(/\s*:\s*/g,': ');
 s=s.replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'. ').replace(/\n/g,'. ');
 s=s.replace(/([.!?])\s*\1+/g,'$1').replace(/\s+([,.;!?])/g,'$1').replace(/([,;:])(?=\S)/g,'$1 ');
 return s.trim();
}
function chooseSpeechVoice(){
 if(!('speechSynthesis' in window))return null;
 const voices=window.speechSynthesis.getVoices()||[];
 const english=voices.filter(v=>/^en(-|_)/i.test(v.lang||''));
 // Prefer a locally installed English India voice, then a high-quality English voice.
 return english.find(v=>/en-IN/i.test(v.lang)&&/natural|neural|premium|google/i.test(v.name))
  ||english.find(v=>/en-IN/i.test(v.lang))
  ||english.find(v=>/natural|neural|premium|google/i.test(v.name))
  ||english.find(v=>/en-GB|en-US/i.test(v.lang))||english[0]||null;
}
function speakText(text,automatic=false){
 if(!('speechSynthesis' in window)){if(!automatic)toast('Read aloud is not supported in this browser. Try Chrome or Edge.');return}
 const clean=cleanTextForSpeech(text);if(!clean)return;
 window.speechSynthesis.cancel();const runId=++speechRunId;
 // Chunk at sentence boundaries so long explanations are less likely to be cut off by the browser.
 const chunks=[];let rest=clean;
 while(rest.length>0){
  if(rest.length<=850){chunks.push(rest);break}
  let cut=Math.max(rest.lastIndexOf('. ',850),rest.lastIndexOf('? ',850),rest.lastIndexOf('! ',850));
  if(cut<350)cut=rest.lastIndexOf(' ',850);if(cut<1)cut=850;
  chunks.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim();
 }
 let index=0;const voice=chooseSpeechVoice();
 const speakNext=()=>{
  if(runId!==speechRunId||index>=chunks.length)return;
  const u=new SpeechSynthesisUtterance(chunks[index++]);
  if(voice)u.voice=voice;u.lang=voice?.lang||'en-IN';u.rate=0.91;u.pitch=1;u.volume=1;
  u.onend=()=>{if(runId===speechRunId)speakNext()};
  u.onerror=()=>{if(runId===speechRunId&&$('voiceStatus'))$('voiceStatus').textContent='Voice playback stopped. Try Read aloud again, or choose another English voice in your browser settings.'};
  window.speechSynthesis.speak(u);
 };
 if($('voiceStatus'))$('voiceStatus').textContent=voice?'🔊 Reading in '+voice.name+'.':'🔊 Reading with your browser’s default voice.';
 speakNext();
}
function updateVoiceToggle(){const b=$('voiceOutputToggle');if(!b)return;b.textContent=voiceRepliesEnabled?'🔊 Voice replies: ON':'🔇 Voice replies: OFF';b.setAttribute('aria-pressed',String(voiceRepliesEnabled));if($('voiceStatus'))$('voiceStatus').textContent=voiceRepliesEnabled?'🔊 AI answers will be spoken automatically.':'AI voice replies are off. Turn them on to hear tutor answers.'}
if($('voiceOutputToggle')){$('voiceOutputToggle').onclick=()=>{voiceRepliesEnabled=!voiceRepliesEnabled;try{localStorage.setItem('dsw_voice_replies',voiceRepliesEnabled?'on':'off')}catch(e){}if(!voiceRepliesEnabled&&'speechSynthesis'in window)window.speechSynthesis.cancel();updateVoiceToggle();if(voiceRepliesEnabled)toast('AI voice replies enabled. New tutor answers will be spoken automatically.')};updateVoiceToggle()}
function addMessage(role,content,isError=false){
 const feed=$('chatFeed');
 const welcome=feed.querySelector('.welcome-block');
 if(welcome)welcome.remove();
 const wrap=document.createElement('article');
 wrap.className='message '+role+(isError?' message-error':'');
 wrap.setAttribute('aria-label',role==='user'?'Your message':'AI tutor response');
 const avatar=document.createElement('div');avatar.className='message-avatar';avatar.textContent=role==='user'?'You':'✳';
 const body=document.createElement('div');body.className='message-body';
 const head=document.createElement('div');head.className='message-head';
 const label=document.createElement('div');label.className='message-label';label.textContent=role==='user'?'YOU':'STRUCTURE AI';
 const badge=document.createElement('span');badge.className='message-kind';badge.textContent=role==='user'?'QUESTION':(isError?'NOTICE':'AI RESPONSE');
 if(role==='assistant'&&!isError){badge.textContent='AI TUTOR'}head.append(label,badge);
 const text=document.createElement('div');text.className=isError?'error-box':'message-content';text.innerHTML=isError?escapeHTML(content):markdown(content);
 body.append(head,text);
 if(role==='assistant'&&!isError){
  const tools=document.createElement('div');tools.className='message-tools';
  const copy=document.createElement('button');copy.type='button';copy.className='read-aloud-button';copy.textContent='▣ Copy answer';
  copy.onclick=async()=>{try{await navigator.clipboard.writeText(content);copy.textContent='✓ Copied';}catch(e){const area=document.createElement('textarea');area.value=content;document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();copy.textContent=ok?'✓ Copied':'Copy unavailable';}setTimeout(()=>copy.textContent='▣ Copy answer',1500)};
  const read=document.createElement('button');read.type='button';read.className='read-aloud-button';read.textContent='🔊 Read aloud';read.onclick=()=>speakText(content);
  const stop=document.createElement('button');stop.type='button';stop.className='read-aloud-button';stop.textContent='■ Stop voice';stop.onclick=()=>('speechSynthesis'in window)&&window.speechSynthesis.cancel();
  tools.append(copy,read,stop);body.append(tools);
 }
 wrap.append(avatar,body);feed.append(wrap);
 // After a long answer arrives, show its BEGINNING. The learner can scroll down naturally.
 requestAnimationFrame(()=>{feed.scrollTop=Math.max(0,wrap.offsetTop-14)});
 if(role==='assistant'&&!isError&&voiceRepliesEnabled){setTimeout(()=>speakText(content,true),180)}
 return wrap
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function inlineMarkdown(s){
 let t=escapeHTML(s);const code=[];
 t=t.replace(/`([^`]+)`/g,(_,v)=>{const k='@@INLINECODE'+code.length+'@@';code.push('<code>'+v+'</code>');return k});
 t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g,'$1<em>$2</em>');
 t=t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
 t=t.replace(/@@INLINECODE(\d+)@@/g,(_,i)=>code[Number(i)]||'');return t
}
function markdown(source){
 // Lightweight Markdown renderer for the formats the tutor commonly returns.
 // Tables, horizontal rules, blockquotes, lists and fenced code are parsed as blocks,
 // rather than being shown as raw pipes/dashes.
 const lines=String(source??'').replace(/\r\n?/g,'\n').split('\n');
 const out=[];let i=0;
 const isFence=l=>/^\s*```/.test(l);
 const isHr=l=>/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l);
 const isTableSep=l=>/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l);
 const cells=l=>{let x=l.trim();if(x.startsWith('|'))x=x.slice(1);if(x.endsWith('|'))x=x.slice(0,-1);return x.split(/(?<!\\)\|/).map(c=>c.trim().replace(/\\\|/g,'|'))};
 const isBullet=l=>/^\s*[-*+]\s+/.test(l);
 const isOrdered=l=>/^\s*\d+[.)]\s+/.test(l);
 const isHeading=l=>/^\s*#{1,6}\s+/.test(l);
 const isQuote=l=>/^\s*>\s?/.test(l);
 const isBlockStart=(l,idx)=>!l.trim()||isFence(l)||isHr(l)||isHeading(l)||isBullet(l)||isOrdered(l)||isQuote(l)||(idx+1<lines.length&&l.includes('|')&&isTableSep(lines[idx+1]));
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){i++;continue}
  if(isFence(line)){
   const m=line.match(/^\s*```([\w+-]*)/);const lang=m?.[1]||'';i++;const code=[];
   while(i<lines.length&&!isFence(lines[i]))code.push(lines[i++]);if(i<lines.length)i++;
   out.push('<pre><code'+(lang?' class="language-'+escapeHTML(lang)+'"':'')+'>'+escapeHTML(code.join('\n'))+'</code></pre>');continue;
  }
  if(isHr(line)){out.push('<hr class="answer-divider">');i++;continue}
  const heading=line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
  if(heading){const n=Math.min(heading[1].length,4);out.push('<h'+n+'>'+inlineMarkdown(heading[2])+'</h'+n+'>');i++;continue}
  if(isQuote(line)){const q=[];while(i<lines.length&&isQuote(lines[i]))q.push(lines[i++].replace(/^\s*>\s?/,'').trim());out.push('<blockquote>'+q.map(x=>'<p>'+inlineMarkdown(x)+'</p>').join('')+'</blockquote>');continue}
  if(i+1<lines.length&&line.includes('|')&&isTableSep(lines[i+1])){
   const heads=cells(line);i+=2;const rows=[];
   while(i<lines.length&&lines[i].trim()&&lines[i].includes('|')&&!isBlockStart(lines[i],i)){rows.push(cells(lines[i++]));}
   const th='<thead><tr>'+heads.map(c=>'<th>'+inlineMarkdown(c)+'</th>').join('')+'</tr></thead>';
   const tb='<tbody>'+rows.map(row=>'<tr>'+heads.map((_,n)=>'<td>'+inlineMarkdown(row[n]??'')+'</td>').join('')+'</tr>').join('')+'</tbody>';
   out.push('<div class="answer-table-wrap"><table>'+th+tb+'</table></div>');continue;
  }
  if(isBullet(line)||isOrdered(line)){
   const ordered=isOrdered(line),tag=ordered?'ol':'ul',items=[];
   while(i<lines.length&&(ordered?isOrdered(lines[i]):isBullet(lines[i]))){items.push(lines[i++].replace(ordered? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/,''));}
   out.push('<'+tag+'>'+items.map(x=>'<li>'+inlineMarkdown(x)+'</li>').join('')+'</'+tag+'>');continue;
  }
  // Ordinary prose: join wrapped lines into a paragraph, but preserve intentional
  // line breaks where Markdown uses two trailing spaces.
  const para=[];
  while(i<lines.length&&!isBlockStart(lines[i],i))para.push(lines[i++]);
  if(!para.length){para.push(lines[i++]);}
  out.push('<p>'+para.map((x,n)=>inlineMarkdown(x.replace(/\s{2,}$/,''))+(n<para.length-1&&/\s{2,}$/.test(x)?'<br>':n<para.length-1?' ':'')).join('')+'</p>');
 }
 return out.join('');
}
async function sendMessage(prompt){if(busy)return;prompt=(prompt||$('messageInput').value).trim();if(!prompt)return;busy=true;$('sendButton').disabled=true;$('messageInput').value='';$('charCount').textContent='0 / 2000';addMessage('user',prompt);const think=document.createElement('div');think.className='thinking';think.textContent='Thinking through your question…';$('chatFeed').append(think);$('chatFeed').scrollTop=$('chatFeed').scrollHeight;const payload={message:prompt,concept:$('concept').value,level:$('level').value,mode:$('mode').value,history};try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let d;try{d=await r.json()}catch{d={ok:false,error:'The server returned an unreadable response. Restart the app and try again.'}}think.remove();if(d.ok){history.push({role:'user',content:prompt},{role:'assistant',content:d.answer});history=history.slice(-24);addMessage('assistant',d.answer);setConnected(true)}else{addMessage('assistant',d.error||'Unknown AI error.',true);if(/401|key/i.test(d.error||''))setConnected(false)}}catch(e){think.remove();addMessage('assistant','Could not contact the local application server. Check that the browser page is still open and start_app.bat is running.',true)}finally{busy=false;$('sendButton').disabled=false;$('messageInput').focus()}}
$('chatForm').onsubmit=e=>{e.preventDefault();sendMessage()};$('messageInput').addEventListener('input',()=>{$('charCount').textContent=$('messageInput').value.length+' / 2000';$('messageInput').style.height='auto';$('messageInput').style.height=Math.min($('messageInput').scrollHeight,140)+'px'});$('messageInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});document.addEventListener('click',e=>{const b=e.target.closest('[data-prompt]');if(!b)return;const p=b.dataset.prompt;if($('page-tutor').classList.contains('active-page'))sendMessage(p);else{showPage('tutor');sendMessage(p)}});$('clearChat').onclick=()=>{history=[];$('chatFeed').innerHTML=document.querySelector('.welcome-block')?document.querySelector('.welcome-block').outerHTML:`<div class="welcome-block"><div class="welcome-icon">✳</div><div class="welcome-label">STRUCTURE AI · READY WHEN YOU ARE</div><h2>What are we figuring out today?</h2><p>From your first stack to graph traversal, let's make it make sense.</p><div class="suggestion-grid"><button class="suggestion" data-prompt="Explain stacks using a real-life analogy, then show a push and pop example."><span>↕</span><b>Explain a concept</b><small>Make it click, step by step</small></button><button class="suggestion" data-prompt="Show me a visual walkthrough of how a queue works, including enqueue and dequeue."><span>▤</span><b>See it visually</b><small>Learn by watching operations</small></button><button class="suggestion" data-prompt="Give me a Python implementation of a singly linked list with comments."><span>⌘</span><b>Explore code</b><small>Readable Python examples</small></button><button class="suggestion" data-prompt="Quiz me on arrays with one question at a time. Start at beginner level and give hints if I struggle."><span>◎</span><b>Test my knowledge</b><small>Practice without pressure</small></button></div></div>`;document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>sendMessage(b.dataset.prompt))};
let modelData={Arrays:[10,20,30],Stacks:[10,20,30],Queues:[10,20,30],'Singly Linked Lists':[10,20,30],'Circular Linked Lists':[10,20,30],'Doubly Linked Lists':[10,20,30],Trees:[8,4,12],Graphs:['A','B','C'],'Heaps / Priority Queues':[3,8,5],Hashing:['key→2']};let graphAdj={A:['B'],B:['A','C'],C:['B']};
function renderBinaryTree(items,heapMode=false){const root=document.createElement('div');root.className='binary-tree-view';if(!items.length||items[0]==null){root.textContent='Empty structure';return root}function nodeAt(i){if(i>=items.length||items[i]===null||items[i]===undefined)return null;const wrap=document.createElement('div');wrap.className='binary-tree-node-wrap';const node=document.createElement('div');node.className='node';node.textContent=items[i];wrap.append(node);const left=nodeAt(i*2+1),right=nodeAt(i*2+2);if(left||right){const kids=document.createElement('div');kids.className='binary-tree-children';const leftSlot=document.createElement('div');leftSlot.className='binary-tree-slot';const rightSlot=document.createElement('div');rightSlot.className='binary-tree-slot';if(left)leftSlot.append(left);if(right)rightSlot.append(right);kids.append(leftSlot,rightSlot);wrap.append(kids)}return wrap}root.append(nodeAt(0));return root}
function renderModel(newVal=null){
 const type=$('visualType').value,items=modelData[type]||[10,20,30],canvas=$('stageCanvas');$('stageTitle').textContent=type;canvas.innerHTML='';
 if(type==='Stacks'){
  const col=document.createElement('div');col.className='stack-column';items.forEach((v,i)=>{const el=document.createElement('div');el.className='stack-item'+(i===items.length-1&&newVal!==null?' new':'');el.textContent=v;col.append(el)});canvas.append(col);$('complexity').textContent='Push / Pop O(1)';
 }else if(type==='Queues'){
  const col=document.createElement('div');col.className='queue-line';items.forEach((v,i)=>{const el=document.createElement('div');el.className='queue-item'+(i===0&&newVal!==null?' new':'');el.textContent=v;col.append(el)});canvas.append(col);$('complexity').textContent='Enqueue / Dequeue O(1)';
 }else if(type==='Trees'){
  canvas.append(renderBinaryTree(items));$('complexity').textContent='Traversal O(n)';
 }else if(type==='Graphs'){
  const graph=document.createElement('div');graph.className='graph-model';items.forEach(v=>{const group=document.createElement('div');group.className='graph-vertex-group';const n=document.createElement('div');n.className='node';n.textContent=v;group.append(n);const adjacent=(graphAdj[v]||[]).filter(x=>items.includes(x));const label=document.createElement('small');label.className='graph-adjacency';label.textContent='Edges: '+(adjacent.join(', ')||'none');group.append(label);graph.append(group)});canvas.append(graph);$('complexity').textContent='BFS / DFS O(V + E)';
 }else if(type.includes('Linked Lists')){
  const row=document.createElement('div');row.className='graph-model linked-model';items.forEach((v,i)=>{if(v===null||v===undefined)return;const n=document.createElement('div');n.className='node'+(i===items.length-1&&newVal!==null?' new':'');n.textContent=type==='Doubly Linked Lists'?'↔ '+v+' ↔':v;row.append(n);if(i<items.length-1){const arrow=document.createElement('span');arrow.className='node-arrow';arrow.textContent=type==='Doubly Linked Lists'?'⇄':'→';row.append(arrow)}});if(type==='Circular Linked Lists'&&items.length){const end=document.createElement('span');end.className='node-arrow';end.textContent='↶ back to '+items[0];row.append(end)}canvas.append(row);$('complexity').textContent='Search O(n)';
 }else if(type==='Heaps / Priority Queues'){
  const heap=items.slice();canvas.append(renderBinaryTree(heap,true));$('complexity').textContent='Insert / Extract O(log n)';
 }else{
  items.forEach((v,i)=>{const el=document.createElement('div');el.className='array-cell'+(i===items.length-1&&newVal!==null?' new':'');el.innerHTML='<div class="cell-index">'+(type==='Hashing'?'bucket '+i:i)+'</div><div class="cell-value">'+escapeHTML(v)+'</div>';canvas.append(el)});$('complexity').textContent=type==='Hashing'?'Average lookup O(1)':'Access O(1)';
 }
 const captions={Arrays:'An array stores values at indexed positions.',Stacks:'A stack follows Last In, First Out (LIFO). Only the top item is pushed or popped.',Queues:'A queue follows First In, First Out (FIFO). Enqueue at the rear and dequeue at the front.','Singly Linked Lists':'Each node stores data and a next link. The last node points to null.','Circular Linked Lists':'The tail links back to the head, creating a loop. Traversal must stop after one full cycle.','Doubly Linked Lists':'Each node has previous and next links, allowing forward and backward traversal.',Trees:'A tree stores hierarchical parent-child relationships. This view illustrates a simple binary-search-tree layout.',Graphs:'A graph contains vertices (nodes) and edges (connections). BFS and DFS explore connected vertices.','Heaps / Priority Queues':'A heap keeps the minimum-priority item at the root in this min-heap example.',Hashing:'A hash function maps a key to a bucket where it can be found efficiently.'};
 const notes={Arrays:'Indexed read O(1). Append is amortized O(1); insert/delete at the beginning is O(n) because values shift.',Stacks:'Push and pop operate at the top in O(1). The most recently added item is removed first.',Queues:'Enqueue at rear and dequeue at front. Both can be O(1) with a suitable queue implementation.','Singly Linked Lists':'Search O(n). Insertion at head O(1); tail insertion is O(1) when a tail pointer is maintained.','Circular Linked Lists':'Traversal is O(n). Because tail links to head, avoid unbounded traversal.','Doubly Linked Lists':'Search O(n). A known node can be unlinked in O(1) when its previous and next references are available.',Trees:'Traversal is O(n). A balanced BST search is O(log n); a skewed tree can take O(n).',Graphs:'BFS and DFS are O(V + E) with adjacency lists. V = vertices and E = edges.','Heaps / Priority Queues':'Peek O(1); insert and extract-min O(log n) in a binary heap.',Hashing:'Average lookup/insert O(1) with good distribution. Collisions need handling; worst-case lookup can be O(n).'};
 $('stageCaption').textContent=captions[type]||'Explore how the structure changes.';$('visualExplanation').textContent=captions[type]||'Explore the structure.';$('complexityNotes').textContent=notes[type]||'Choose an operation to explore its cost.';if(!window.visualTrace)window.visualTrace=[];if(newVal!==null){window.visualTrace.push('Structure updated. Current values: '+items.filter(x=>x!==null&&x!==undefined).join(', '));window.visualTrace=window.visualTrace.slice(-8)}$('operationTrace').innerHTML=(window.visualTrace&&window.visualTrace.length?window.visualTrace:['Choose an operation to see the steps.']).map(x=>'<li>'+escapeHTML(x)+'</li>').join('')
}
const operationSets={
 'Arrays':[['insert_end','Insert at end'],['insert_start','Insert at beginning'],['delete_end','Delete last'],['delete_start','Delete first'],['search','Search value'],['reset','Reset model']],
 'Stacks':[['push','Push onto top'],['pop','Pop from top'],['peek','Peek at top'],['reset','Reset model']],
 'Queues':[['enqueue','Enqueue at rear'],['dequeue','Dequeue from front'],['peek','Peek at front'],['reset','Reset model']],
 'Singly Linked Lists':[['insert_end','Insert at tail'],['insert_start','Insert at head'],['delete_start','Delete head'],['delete_end','Delete tail'],['search','Search value'],['reset','Reset model']],
 'Circular Linked Lists':[['insert_end','Insert at tail (circular)'],['insert_start','Insert at head (circular)'],['delete_start','Delete head'],['traverse','Traverse one cycle'],['reset','Reset model']],
 'Doubly Linked Lists':[['insert_end','Insert at tail'],['insert_start','Insert at head'],['delete_start','Delete head'],['delete_end','Delete tail'],['traverse','Traverse forward'],['reset','Reset model']],
 'Trees':[['tree_insert','Insert node (BST)'],['inorder','In-order traversal'],['preorder','Pre-order traversal'],['postorder','Post-order traversal'],['search','Search value'],['reset','Reset model']],
 'Graphs':[['add_vertex','Add vertex'],['add_edge','Add edge to next vertex'],['bfs','Run BFS traversal'],['dfs','Run DFS traversal'],['reset','Reset model']],
 'Heaps / Priority Queues':[['heap_insert','Insert into heap'],['extract_min','Extract minimum'],['peek','Peek at highest priority'],['reset','Reset model']],
 'Hashing':[['hash_insert','Insert key'],['search','Search key'],['hash_delete','Delete key'],['reset','Reset model']]
};
function updateOperationOptions(){const type=$('visualType').value,sel=$('operation');sel.innerHTML='';(operationSets[type]||operationSets.Arrays).forEach(([v,label])=>{const o=document.createElement('option');o.value=v;o.textContent=label;sel.append(o)});$('valueInput').placeholder=type==='Graphs'?'Vertex / key':'Value or key'}
function asValue(v){return v!==''&&!Number.isNaN(Number(v))?Number(v):v}
function trace(lines){window.visualTrace=lines.slice(-8)}
$('visualType').onchange=()=>{const t=$('visualType').value;$('concept').value=t;updateOperationOptions();window.visualTrace=[];$('operationHint').textContent='Choose a structure-specific operation.';renderModel()};
$('runOperation').onclick=()=>{const type=$('visualType').value,op=$('operation').value,raw=$('valueInput').value.trim(),val=asValue(raw||'42');let items=modelData[type]||[];const before=items.slice();let message='',lines=[];
if(op==='reset'){modelData[type]=type==='Trees'?[8,4,12]:type==='Graphs'?['A','B','C']:type==='Heaps / Priority Queues'?[3,8,5]:type==='Hashing'?['key→2']:[10,20,30];if(type==='Graphs')graphAdj={A:['B'],B:['A','C'],C:['B']};trace(['Model reset to its starting state.']);$('operationHint').textContent='Model reset to its initial values.';renderModel();return}
if(type==='Stacks'){
 if(op==='push'){items.push(val);message=`Push ${val}: place the value on the top of the stack. O(1).`;lines=[`Before (bottom → top): ${before.join(', ')}`,`Push ${val} onto the top`,`After: ${items.join(', ')}`]}
 else if(op==='pop'){if(!items.length)message='The stack is empty. Nothing can be popped.';else{const r=items.pop();message=`Pop removes ${r}, the most recently added item (LIFO). O(1).`;lines=[`Top before: ${r}`,`Pop removes ${r}`,`After: ${items.join(', ')||'empty'}`]}}
 else if(op==='peek')message=items.length?`The top item is ${items[items.length-1]}. Peek does not remove it. O(1).`:'The stack is empty.';
}else if(type==='Queues'){
 if(op==='enqueue'){items.push(val);message=`Enqueue ${val} at the rear of the queue. O(1) with a suitable queue.`;lines=[`Before (front → rear): ${before.join(', ')}`,`Enqueue ${val} at rear`,`After: ${items.join(', ')}`]}
 else if(op==='dequeue'){if(!items.length)message='The queue is empty. Nothing can be dequeued.';else{const r=items.shift();message=`Dequeue removes ${r} from the front (FIFO). O(1) with a suitable queue.`;lines=[`Front before: ${r}`,`Dequeue ${r} from front`,`After: ${items.join(', ')||'empty'}`]}}
 else if(op==='peek')message=items.length?`The front item is ${items[0]}. Peek leaves the queue unchanged.`:'The queue is empty.';
}else if(type==='Arrays'||type.includes('Linked Lists')){
 if(op==='insert_end'){items.push(val);message=`Insert ${val} at the tail/end. ${type==='Arrays'?'Array append is amortized O(1).':'Tail insertion is O(1) when a tail pointer is maintained.'}`}
 else if(op==='insert_start'){items.unshift(val);message=`Insert ${val} at the beginning. ${type==='Arrays'?'Existing values shift right, so this is O(n).':'Update the head link to point to the new node.'}`}
 else if(op==='delete_start'){if(items.length){const r=items.shift();message=`Delete the head/first value ${r}.`; }else message='The structure is empty.'}
 else if(op==='delete_end'){if(items.length){const r=items.pop();message=`Delete the tail/last value ${r}.`; }else message='The structure is empty.'}
 else if(op==='search'){const idx=items.findIndex(x=>String(x)===String(val));message=idx>=0?`Found ${val} at position ${idx}. Search is O(n) in a linked list and O(n) for an unsorted array.`:`${val} was not found. A linear search checked ${items.length} item(s).`}
 else if(op==='traverse'){message=`Traverse one cycle/forward through: ${items.join(' → ')}${type==='Circular Linked Lists'&&items.length?' → back to '+items[0]:''}.`;}
 lines=[`Before: ${before.join(', ')||'empty'}`,`Operation: ${$('operation').selectedOptions[0].textContent}${['insert_end','insert_start'].includes(op)?' '+val:''}`,`After: ${items.join(', ')||'empty'}`];
}else if(type==='Trees'){
 if(op==='tree_insert'){if(!items.length)items.push(val);else{let n=0,guard=0;while(guard++<30){const child=Number(val)<Number(items[n])?n*2+1:n*2+2;if(child>=items.length){while(items.length<child)items.push(null);items[child]=val;break}if(items[child]===null){items[child]=val;break}n=child}}message=`Insert ${val} into the binary-search-tree model by comparing values and choosing left for smaller, right for larger. Typical balanced cost O(log n), worst case O(n).`;}
 else if(['inorder','preorder','postorder'].includes(op)){const result=[];function walk(i){if(i>=items.length||items[i]===null||items[i]===undefined)return;if(op==='preorder')result.push(items[i]);walk(2*i+1);if(op==='inorder')result.push(items[i]);walk(2*i+2);if(op==='postorder')result.push(items[i])}walk(0);message=`${op[0].toUpperCase()+op.slice(1)} traversal visits: ${result.join(' → ')||'no nodes'}. Traversal is O(n).`;lines=[`Traversal selected: ${op}`,`Visit order: ${result.join(', ')||'empty'}`]}
 else if(op==='search'){const idx=items.findIndex(x=>String(x)===String(val));message=idx>=0?`Node ${val} is present in the current tree model.`:`Node ${val} is not present in the current tree model.`}
}else if(type==='Graphs'){
 if(op==='add_vertex'){if(!items.some(x=>String(x)===String(val)))items.push(val);message=`Add vertex ${val}. A vertex is a point in the graph. Add edges to describe its connections.`}
 else if(op==='add_edge'){if(items.length<2)message='Add at least two vertices before creating an edge.';else message=`Add an edge between ${items[items.length-2]} and ${items[items.length-1]}. This demo shows a simple connected sequence; a full graph stores an adjacency list.`}
 else if(op==='bfs'||op==='dfs'){const seq=op==='bfs'?items:items.slice().reverse();message=`${op.toUpperCase()} traversal demo order: ${seq.join(' → ')}. In a real graph, traversal follows adjacency links and uses a visited set. Complexity with adjacency lists: O(V + E).`;lines=[`Start at ${items[0]??'no vertex'}`,`Visit order (${op.toUpperCase()}): ${seq.join(', ')}`,`Time complexity: O(V + E)`]}
}else if(type==='Heaps / Priority Queues'){
 if(op==='heap_insert'){items.push(val);items.sort((a,b)=>Number(a)-Number(b));message=`Insert ${val}, then restore min-heap order. This simplified model sorts values to illustrate priority order; real heap insertion is O(log n).`}
 else if(op==='extract_min'){if(items.length){items.sort((a,b)=>Number(a)-Number(b));const r=items.shift();message=`Extract minimum removes ${r}, the highest-priority item in this min-heap example. O(log n).`}else message='The heap is empty.'}
 else if(op==='peek')message=items.length?`The minimum/highest-priority item is ${Math.min(...items.map(Number))}. It remains in the heap. O(1).`:'The heap is empty.';
}else if(type==='Hashing'){
 if(op==='hash_insert'){const k=String(val),entry=`${k}→${Math.abs([...k].reduce((a,c)=>a+c.charCodeAt(0),0))%7}`;const i=items.findIndex(x=>String(x).split('→')[0]===k);if(i>=0)items[i]=entry;else items.push(entry);message=`Insert key ${k}; this demo maps it to bucket ${entry.split('→')[1]}. Average lookup/insert is O(1) with a good hash table.`}
 else if(op==='search'){const found=items.find(x=>String(x).split('→')[0]===String(val));message=found?`Key ${val} found at bucket ${String(found).split('→')[1]}.`:`Key ${val} was not found in the displayed entries.`}
 else if(op==='hash_delete'){const i=items.findIndex(x=>String(x).split('→')[0]===String(val));if(i>=0){const r=items.splice(i,1)[0];message=`Deleted ${r} from the hash table.`}else message=`Key ${val} was not found; nothing deleted.`}
}
modelData[type]=items; if(!lines.length)lines=[`Before: ${before.join(', ')||'empty'}`,`Action: ${$('operation').selectedOptions[0].textContent}${['insert_end','insert_start','tree_insert','heap_insert','add_vertex','hash_insert'].includes(op)?' '+val:''}`,`After: ${items.join(', ')||'empty'}`];trace(lines);$('operationHint').textContent=message||'Operation completed.';renderModel(val);
};
$('resetModel').onclick=()=>{$('operation').value='reset';$('runOperation').click()};updateOperationOptions();
const questionBank={
'Arrays':[
{q:'What is the first index in a Python list?',a:['0','1','-1','No index'],correct:0,hint:'Python uses zero-based indexing.',why:'The first element is at index 0.'},
{q:'What is the time complexity of reading arr[4] by index?',a:['O(n)','O(log n)','O(1)','O(n²)'],correct:2,hint:'The index lets Python go directly to the position.',why:'Array/list index access is O(1) on average.'},
{q:'Which operation usually requires shifting elements in an array-backed list?',a:['Read an item by index','Insert at the beginning','Read the length','Access the last item'],correct:1,hint:'Existing items must make room.',why:'Inserting at the beginning shifts later elements, so it takes O(n).'},
{q:'What does len([4, 8, 12]) return?',a:['2','3','4','12'],correct:1,hint:'Count the items, not their index.',why:'There are three elements, so len returns 3.'},
{q:'If nums = [7, 9, 11], what is nums[-1] in Python?',a:['7','9','11','An error'],correct:2,hint:'Negative indexing counts backward from the end.',why:'Index -1 selects the final element, 11.'},
{q:'Which Python operation adds 15 to the end of nums?',a:['nums.add(15)','nums.append(15)','nums.insertEnd(15)','nums.pushBack(15)'],correct:1,hint:'Use the list method whose name means attach at the end.',why:'append adds one item to the end of a Python list.'},
{q:'A list has 5 items. What is the last valid positive index?',a:['5','4','6','0'],correct:1,hint:'The first index is zero.',why:'Five items use indices 0 through 4.'},
{q:'Which is a common advantage of arrays?',a:['Direct indexed access','Every insertion is O(1)','No memory is used','They only store strings'],correct:0,hint:'Think about how quickly an index finds an item.',why:'Arrays provide fast indexed access.'}],
'Stacks':[
{q:'A stack contains [10, 20, 30], with 30 on top. What does pop() remove?',a:['10','20','30','All items'],correct:2,hint:'A stack follows Last In, First Out.',why:'pop removes the top item, 30.'},
{q:'Which rule describes a stack?',a:['FIFO','LIFO','Random access only','Sorted first'],correct:1,hint:'The newest item leaves first.',why:'Stack means Last In, First Out (LIFO).'},
{q:'Which operation adds an item to a stack?',a:['enqueue','dequeue','push','peek only'],correct:2,hint:'It places an item on top.',why:'push adds an item to the top of a stack.'},
{q:'After push(4), push(8), pop(), what remains on top?',a:['4','8','Nothing','Both 4 and 8'],correct:0,hint:'The pop removes the newest value.',why:'8 is removed, leaving 4 on top.'},
{q:'What does peek() usually do?',a:['Removes the top item','Shows the top item without removing it','Sorts the stack','Empties the stack'],correct:1,hint:'It lets you inspect, not remove.',why:'peek returns the top element without changing the stack.'},
{q:'Which real-world task naturally uses a stack?',a:['Printer queue','Undo history','People at a bus stop','Network shortest path only'],correct:1,hint:'The most recent action is undone first.',why:'Undo systems often use a stack of recent actions.'},
{q:'What is the usual time complexity of push on a stack implemented with a dynamic array?',a:['O(1) amortized','O(n) always','O(log n)','O(n²)'],correct:0,hint:'Adding to the end is usually constant time.',why:'Push is O(1) amortized, although resizing can occasionally cost O(n).'},
{q:'What is stack underflow?',a:['Adding to a full tree','Popping from an empty stack','Sorting a stack','Reading the top'],correct:1,hint:'Underflow occurs when there is not enough data for removal.',why:'Popping an empty stack causes underflow.'}],
'Queues':[
{q:'In a queue [A, B, C], which item is dequeued first?',a:['C','B','A','Random item'],correct:2,hint:'Think about a line of people waiting.',why:'Queues follow First In, First Out, so A leaves first.'},
{q:'Which operation adds an item to the back of a queue?',a:['push','enqueue','pop','peek'],correct:1,hint:'This is the standard queue insertion operation.',why:'enqueue inserts an item at the rear.'},
{q:'Which rule describes a normal queue?',a:['LIFO','FIFO','Highest value first','Last index first'],correct:1,hint:'The first person waiting is served first.',why:'A queue follows First In, First Out (FIFO).'},
{q:'In a queue, what does dequeue do?',a:['Adds at rear','Removes from front','Sorts all values','Reads any index'],correct:1,hint:'It serves the next waiting item.',why:'dequeue removes the front item.'},
{q:'Which is a typical use of a queue?',a:['Function call stack','Print jobs waiting for a printer','Undo last action','Binary search'],correct:1,hint:'Jobs are handled in arrival order.',why:'Printer jobs are commonly processed in queue order.'},
{q:'What problem can a simple array queue have if it never reuses freed front slots?',a:['Memory is encrypted','Wasted space after repeated dequeues','It cannot enqueue','It automatically sorts'],correct:1,hint:'Removed front positions may remain unused.',why:'A circular queue reuses positions and avoids this wasted space.'},
{q:'What does a circular queue connect?',a:['The last slot back to the first slot','Every node to every other node','A tree to a stack','Keys to hashes'],correct:0,hint:'Imagine the array as a ring.',why:'Circular indexing wraps from the last position to the first.'},
{q:'Breadth-first search commonly uses which structure?',a:['Queue','Stack only','Hash function only','Heap sort'],correct:0,hint:'BFS visits vertices in layers, in arrival order.',why:'A queue stores the frontier for breadth-first search.'}],
'Linked Lists':[
{q:'What does a node in a singly linked list store?',a:['Only data','Data and a next reference','Only an index','A whole array'],correct:1,hint:'Each node needs to connect to the next node.',why:'A node stores data and a reference to the next node.'},
{q:'How do you identify the first node of a linked list?',a:['Tail','Root','Head','Bucket'],correct:2,hint:'The name refers to the beginning.',why:'The head points to the first node.'},
{q:'What marks the end of a typical singly linked list?',a:['next points to None/null','head points to itself always','The largest value','An array index'],correct:0,hint:'There is no next node after the last one.',why:'The final node’s next reference is None/null.'},
{q:'What is a key advantage of linked lists over fixed arrays?',a:['Always O(1) search','Easy insertion after a known node','No pointer memory','Random access is faster'],correct:1,hint:'Links can be changed without shifting all later elements.',why:'Insertion after a known node can be O(1).'},
{q:'What is the time complexity of searching an unsorted linked list?',a:['O(1)','O(log n)','O(n)','O(n log n)'],correct:2,hint:'You may need to visit every node.',why:'Linear search may examine all n nodes.'},
{q:'Why is direct access to the 10th linked-list element not O(1)?',a:['Nodes must be followed one by one','Lists are always sorted','The head is encrypted','The element has no data'],correct:0,hint:'There is no index-based jump in a normal linked list.',why:'You traverse links from the head, making access O(n).'},
{q:'In a doubly linked list, each node normally has:',a:['Only next','Previous and next references','Two data arrays','A priority value only'],correct:1,hint:'Doubly means it can connect in two directions.',why:'Each node has previous and next links.'},
{q:'What is a circular linked list?',a:['A list whose final link returns to a node, often the head','A list that stores only circles','An array sorted in a circle','A tree with no root'],correct:0,hint:'Follow next from the tail and it loops back.',why:'The links form a cycle instead of ending at null.'}],
'Trees':[
{q:'In a binary tree, what is the maximum number of children per node?',a:['1','2','3','Unlimited'],correct:1,hint:'The word binary refers to two.',why:'A binary tree node can have at most two children.'},
{q:'What is the top node of a tree called?',a:['Head only','Root','Edge','Bucket'],correct:1,hint:'It is the starting point of the hierarchy.',why:'The root is the topmost node.'},
{q:'A node with no children is called a:',a:['Root only','Leaf','Parent','Edge'],correct:1,hint:'It sits at the end of a branch.',why:'A leaf node has no children.'},
{q:'Which traversal visits root, then left subtree, then right subtree?',a:['Inorder','Preorder','Postorder','Level order'],correct:1,hint:'The root is processed before its children.',why:'Preorder is root-left-right.'},
{q:'Which traversal visits left subtree, root, then right subtree?',a:['Preorder','Inorder','Postorder','BFS only'],correct:1,hint:'The root is processed between the two subtrees.',why:'Inorder is left-root-right.'},
{q:'In a binary search tree, values in the left subtree are typically:',a:['Greater than root','Less than root','Always equal','Random strings only'],correct:1,hint:'The BST ordering property separates smaller and larger values.',why:'Values in the left subtree are less than the node, under the usual distinct-key rule.'},
{q:'Which structure is commonly used to implement a priority queue efficiently?',a:['Heap','Plain unsorted text file','Only a stack','Graph edge'],correct:0,hint:'It keeps a highest- or lowest-priority item near the top.',why:'A binary heap supports efficient priority queue operations.'},
{q:'What is the height of a tree related to?',a:['Longest root-to-leaf path','Number of labels only','Total file size','Hash value'],correct:0,hint:'Think about the deepest branch.',why:'Height measures the longest path from a node to a leaf, by the chosen edge/node convention.'}],
'Graphs':[
{q:'What are the two main components of a graph?',a:['Roots and leaves','Keys and buckets','Vertices and edges','Stacks and queues'],correct:2,hint:'Think of places and the connections between them.',why:'A graph consists of vertices (nodes) and edges (connections).'},
{q:'What does an edge represent?',a:['A connection between vertices','A root value','An array index','A hash collision only'],correct:0,hint:'It links two nodes.',why:'Edges represent relationships or connections between vertices.'},
{q:'In an undirected graph, an edge between A and B means:',a:['Only A can reach B','Only B can reach A','The connection has no direction','A and B must be equal'],correct:2,hint:'There are no arrowheads on undirected edges.',why:'An undirected edge can be traversed in either direction.'},
{q:'Which algorithm uses a queue for traversal?',a:['DFS','BFS','Binary search','Heapify only'],correct:1,hint:'It explores neighbours level by level.',why:'Breadth-first search uses a queue.'},
{q:'Which structure is commonly used by iterative depth-first search?',a:['Queue only','Stack','Hash bucket only','Priority queue always'],correct:1,hint:'DFS follows a path deeply before backtracking.',why:'A stack stores vertices to visit in iterative DFS.'},
{q:'What is the time complexity of BFS with an adjacency list?',a:['O(V + E)','O(V²) always','O(log V)','O(1)'],correct:0,hint:'Each vertex and edge is processed a bounded number of times.',why:'BFS runs in O(V + E) with an adjacency-list representation.'},
{q:'A directed graph has edges that:',a:['Have a direction','Must connect every pair','Cannot have weights','Always form a tree'],correct:0,hint:'Arrows show the allowed direction.',why:'Directed edges go from a source vertex to a destination vertex.'},
{q:'What is a path in a graph?',a:['A sequence of connected vertices/edges','Only the largest vertex','A sorted array','A stack overflow'],correct:0,hint:'You travel from one node to another through connections.',why:'A path is a sequence of vertices connected by edges.'}],
'Heaps / Priority Queues':[
{q:'In a max-heap, where is the maximum element?',a:['At the root','Always at the last array slot','At every leaf','Nowhere specific'],correct:0,hint:'The heap property keeps the largest value above its children.',why:'The maximum is at the root of a max-heap.'},
{q:'What is the typical time complexity of inserting into a binary heap?',a:['O(1) always','O(log n)','O(n²)','O(log log n)'],correct:1,hint:'The new value may move up the heap height.',why:'Heap insertion takes O(log n) in the worst case.'},
{q:'A min-heap keeps which value at the root?',a:['Largest','Smallest','Most recent','Random'],correct:1,hint:'Min means minimum.',why:'The smallest value is at the root of a min-heap.'},
{q:'After removing the root of a binary heap, what is commonly done?',a:['Move last item to root and sift down','Delete every node','Sort with bubble sort always','Turn it into a graph'],correct:0,hint:'The heap restores its shape and ordering property.',why:'The last item replaces the root and is sifted down to restore heap order.'},
{q:'Which is a common use of a priority queue?',a:['Scheduling tasks by priority','Keeping text in insertion order only','Replacing all variables','Encrypting a password by itself'],correct:0,hint:'Some tasks must be processed before others.',why:'Priority queues select the item with the highest or lowest priority.'},
{q:'A binary heap is commonly stored in:',a:['An array','Only a linked circular graph','A plain string','A single scalar'],correct:0,hint:'Parent and child positions can be calculated from indices.',why:'An array stores a complete binary tree compactly.'},
{q:'In a zero-indexed heap array, the left child of index i is at:',a:['i + 1','2i + 1','2i','i / 2'],correct:1,hint:'The child-index formula starts with twice the parent index.',why:'For a zero-indexed binary heap, left child = 2i + 1.'},
{q:'What does extract-min do in a min-priority queue?',a:['Returns/removes the smallest item','Adds a random item','Reverses all values','Finds the median always'],correct:0,hint:'The operation name tells you the priority being extracted.',why:'extract-min removes and returns the smallest-priority value.'}],
'Hashing':[
{q:'What is the purpose of a hash function?',a:['Sort every key','Map a key to a bucket/index','Reverse a list','Create a tree'],correct:1,hint:'It helps decide where a key should be stored.',why:'A hash function maps a key to a location in a hash table.'},
{q:'What is a hash collision?',a:['Two keys map to the same bucket','A key is always unique','A list becomes sorted','A tree loses its root'],correct:0,hint:'Different keys can produce the same location.',why:'A collision occurs when two keys map to the same table index.'},
{q:'Which is a common collision-resolution method?',a:['Chaining','Binary traversal','Push-pop only','Preorder'],correct:0,hint:'One bucket can hold a small collection of entries.',why:'Chaining stores multiple entries in a bucket, often using a list.'},
{q:'What is the average-case lookup time in a well-sized hash table?',a:['O(1)','O(n²)','O(log n) always','O(V + E)'],correct:0,hint:'A good hash distributes keys across buckets.',why:'Average lookup is O(1) under suitable hashing and load assumptions.'},
{q:'What is a load factor?',a:['Entries divided by table capacity','The largest key','Number of tree roots','The key encryption strength'],correct:0,hint:'It compares how many items are stored with available buckets.',why:'Load factor is commonly n/m, entries over bucket count.'},
{q:'Why might a hash table resize?',a:['Load factor becomes too high','A key is a number','There are no collisions ever','To make it a queue'],correct:0,hint:'More capacity can reduce crowding and collisions.',why:'Resizing expands the table and redistributes entries.'},
{q:'Should a hash function be deterministic for the same key and configuration?',a:['Yes','No, every call must be random','Only for strings','Only after sorting'],correct:0,hint:'The key must map consistently so it can be found again.',why:'A hash function must produce a consistent result for the same key in the relevant context.'},
{q:'Which data structure commonly uses hashing for fast key lookup?',a:['Dictionary / map','Binary tree only','Queue only','Stack only'],correct:0,hint:'Python has a built-in key-value collection.',why:'Dictionaries and maps commonly use hash tables.'}],
'Circular Linked Lists':[
{q:'What makes a linked list circular?',a:['The final link points back to a node, often the head','Every node has two children','It stores only numbers','It has no links'],correct:0,hint:'Following next eventually loops back.',why:'A circular list links the tail back into the list rather than ending at null.'},
{q:'In a circular singly linked list with one node, where can next point?',a:['To itself','Only to null','To an array index','It cannot point anywhere'],correct:0,hint:'The circle can contain just one node.',why:'A one-node circular list commonly points its next reference to itself.'},
{q:'What must traversal code do to avoid an infinite loop in a circular list?',a:['Stop when it reaches the starting node again','Wait for null forever','Sort every node','Delete the head first'],correct:0,hint:'There may be no null at the end.',why:'Track the start node and stop when traversal returns to it.'},
{q:'Which application can benefit from a circular list?',a:['Round-robin scheduling','A single last-in-first-out undo stack only','Binary search in a sorted array','Hashing strings'],correct:0,hint:'After the last participant, the next turn returns to the first.',why:'Circular lists naturally represent repeated cycles such as round-robin turns.'},
{q:'Does a circular list necessarily have a null next pointer at the tail?',a:['Yes','No','Only if sorted','Only if it has 2 nodes'],correct:1,hint:'The tail reconnects into the circle.',why:'The tail usually points to the head or another node in the cycle.'},
{q:'What is a key challenge when printing a circular list?',a:['Knowing when to stop','Finding any next pointer','Storing values','Creating a head'],correct:0,hint:'The traversal can loop indefinitely.',why:'A stopping condition is needed because there may be no null terminator.'},
{q:'A circular list has nodes A → B → C → A. What follows C?',a:['Null','A','B only','C always'],correct:1,hint:'Follow the arrow that closes the circle.',why:'C links back to A.'},
{q:'Which statement is true?',a:['Circular lists can be singly or doubly linked','They cannot store data','They must be sorted','They are always trees'],correct:0,hint:'Circular describes the link pattern, not the number of directions.',why:'Both singly and doubly linked lists can be circular.'}],
'Doubly Linked Lists':[
{q:'Each node in a doubly linked list typically contains:',a:['Data and next only','Data, previous, and next','Only a hash key','Two child trees'],correct:1,hint:'Doubly linked nodes can move both ways.',why:'A node has previous and next references plus its data.'},
{q:'What is a main advantage of a doubly linked list?',a:['Can traverse backward','Always uses less memory','Random access is O(1)','Never needs pointer updates'],correct:0,hint:'The previous link gives a reverse direction.',why:'The previous reference supports backward traversal.'},
{q:'Compared with a singly linked list, a doubly linked list usually uses:',a:['More memory per node','No memory','Less memory always','Only array memory'],correct:0,hint:'Each node stores an extra reference.',why:'The previous pointer increases per-node memory usage.'},
{q:'When deleting a middle node with its reference already known, what usually needs updating?',a:['Neighbouring previous/next links','Every node value','Only the array length','The hash function'],correct:0,hint:'Reconnect the node before and after it.',why:'The surrounding nodes must be linked to each other.'},
{q:'What should the previous pointer of the head usually be?',a:['The tail always','Null / None','The next node','The list length'],correct:1,hint:'There is no node before the head in a non-circular list.',why:'The head’s previous reference is normally null.'},
{q:'In a non-circular doubly linked list, what does the tail next pointer normally contain?',a:['Null / None','The head always','The root','The smallest value'],correct:0,hint:'There is no node after the tail.',why:'The tail next pointer is normally null.'},
{q:'Which feature helps delete a known node more easily than in a singly linked list?',a:['A previous pointer','A hash collision','An array index always','A tree root'],correct:0,hint:'You can reach the node before it directly.',why:'The previous pointer helps reconnect the list around the removed node.'},
{q:'What is a common use of a doubly linked list?',a:['Browser navigation between previous and next pages','Only binary search','Only hashing','Sorting a graph by colour'],correct:0,hint:'The user can move backward and forward.',why:'Doubly linked lists can support bidirectional navigation.'}]
};
const topicAliases={'Singly Linked Lists':'Linked Lists','Circular Linked Lists':'Circular Linked Lists','Doubly Linked Lists':'Doubly Linked Lists','Heaps / Priority Queues':'Heaps / Priority Queues'};
const topicQuestionIndex={};let currentQuestion=null;
function getTopicQuestions(){let topic=$('quizTopic').value;return questionBank[topic]||questionBank[topicAliases[topic]]||questionBank.Arrays}
function loadQuestion(){const bank=getTopicQuestions(),topic=$('quizTopic').value;let idx=topicQuestionIndex[topic]||0;if(idx>=bank.length){idx=0;topicQuestionIndex[topic]=0}const split1=Math.max(1,Math.ceil(bank.length/3)),split2=Math.max(split1+1,Math.ceil(bank.length*2/3));let pool=bank.map((_,i)=>i);if(adaptiveDifficulty==='Beginner')pool=pool.slice(0,split1);else if(adaptiveDifficulty==='Intermediate')pool=pool.slice(split1,split2);else pool=pool.slice(split2);if(!pool.length)pool=bank.map((_,i)=>i);idx=pool[idx%pool.length];$('difficultyBadge').textContent=adaptiveDifficulty.toUpperCase();currentQuestion=bank[idx];selectedAnswer=null;$('questionText').textContent=currentQuestion.q;$('answers').innerHTML='';currentQuestion.a.forEach((a,i)=>{const b=document.createElement('button');b.className='answer-option';b.textContent=String.fromCharCode(65+i)+'. '+a;b.onclick=()=>{selectedAnswer=i;document.querySelectorAll('.answer-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')};$('answers').append(b)});$('questionNumber').textContent='QUESTION '+String(idx+1).padStart(2,'0');$('questionCounter').textContent=`Question ${idx+1} of ${bank.length}`;$('questionProgressBar').style.width=((idx+1)/bank.length*100)+'%';$('practiceSetLabel').textContent=`${bank.length} questions in ${topic}`;$('feedback').className='feedback hidden';$('hintButton').disabled=false;$('nextQuestion').classList.add('hidden');$('checkAnswer').classList.remove('hidden')}
$('quizTopic').onchange=loadQuestion;$('hintButton').onclick=()=>{const q=currentQuestion||getTopicQuestions()[0];$('feedback').className='feedback';$('feedback').textContent='Hint: '+q.hint};$('checkAnswer').onclick=()=>{if(selectedAnswer===null){$('feedback').className='feedback bad';$('feedback').textContent='Choose an answer first. Take your time.';return}const q=currentQuestion,correct=selectedAnswer===q.correct;practiceStats.push({topic:$('quizTopic').value,correct,difficulty:adaptiveDifficulty});fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:$('quizTopic').value,correct,difficulty:adaptiveDifficulty})}).catch(()=>{});const recent=practiceStats.slice(-5);const recentRate=recent.filter(x=>x.correct).length/Math.max(1,recent.length);adaptiveDifficulty=recent.length>=3&&recentRate>=0.8?'Advanced':recent.length>=3&&recentRate<0.5?'Beginner':recentRate>=0.6?'Intermediate':'Beginner';$('difficultyBadge').textContent=adaptiveDifficulty.toUpperCase();$('adaptiveNote').textContent=adaptiveDifficulty==='Advanced'?'You are doing well. Try explaining why the answer is correct, then move to coding challenges.':adaptiveDifficulty==='Intermediate'?'You are building confidence. Next, focus on tracing operations and edge cases.':'Take your time. Use the hint and review the explanation before moving on.';document.querySelectorAll('.answer-option').forEach((b,i)=>{b.disabled=true;if(i===q.correct)b.classList.add('correct');else if(i===selectedAnswer)b.classList.add('incorrect')});$('feedback').className='feedback'+(correct?'':' bad');$('feedback').textContent=(correct?'Correct! ':'Not quite. ')+q.why;$('checkAnswer').classList.add('hidden');$('nextQuestion').classList.remove('hidden');updateProgress()};$('nextQuestion').onclick=()=>{const topic=$('quizTopic').value;topicQuestionIndex[topic]=((topicQuestionIndex[topic]||0)+1)%getTopicQuestions().length;loadQuestion()};$('restartTopic').onclick=()=>{topicQuestionIndex[$('quizTopic').value]=0;loadQuestion()};function updateProgress(){const correct=practiceStats.filter(x=>x.correct).length;$('answeredCount').textContent=practiceStats.length;$('correctCount').textContent=correct;$('accuracyCount').textContent=Math.round(correct/Math.max(1,practiceStats.length)*100)+'%';if($('dashAccuracy'))$('dashAccuracy').textContent=Math.round(correct/Math.max(1,practiceStats.length)*100)+'%';if($('dashAttempts'))$('dashAttempts').textContent=practiceStats.length+' practice attempts';if($('nextRecommendation')){const byTopic={};practiceStats.forEach(a=>{const k=a.topic;byTopic[k]=byTopic[k]||{n:0,c:0};byTopic[k].n++;if(a.correct)byTopic[k].c++});const weak=Object.entries(byTopic).filter(([k,v])=>v.n>=2).sort((a,b)=>(a[1].c/a[1].n)-(b[1].c/b[1].n))[0];const title=$('nextRecommendation').querySelector('h3'),para=$('nextRecommendation').querySelector('p');if(weak){title.textContent='Review '+weak[0]+'.';para.textContent='Your recent accuracy for this topic is '+Math.round(weak[1].c/weak[1].n*100)+'%. Try a hint-supported practice round.'}else if(practiceStats.length){title.textContent='Keep your momentum.';para.textContent='Try another topic or ask the AI Tutor to explain a concept you missed.'}}$('progressList').innerHTML='';if(!practiceStats.length){$('progressList').innerHTML='<div class="empty-state">No practice attempts yet. Your first step counts.</div>';return}practiceStats.slice().reverse().slice(0,80).forEach(s=>{const row=document.createElement('div');row.className='progress-item';row.innerHTML='<span>'+escapeHTML(s.topic)+' · '+escapeHTML(s.difficulty||'Practice')+'</span><span>'+(s.correct?'Correct ✓':'Review needed')+'</span>';$('progressList').append(row)})}
async function loadPersistedProgress(){try{const r=await fetch('/api/progress');if(!r.ok)return;const d=await r.json();if(d.ok){practiceStats=(d.attempts||[]).map(a=>({topic:a.topic,correct:a.correct,difficulty:a.difficulty}));const recent=practiceStats.slice(0,5);if(recent.length>=3){const rate=recent.filter(x=>x.correct).length/recent.length;adaptiveDifficulty=rate>=0.8?'Advanced':rate<0.5?'Beginner':'Intermediate'}updateProgress()}}catch(e){}}
async function loadTeacherAnalytics(){const box=$('teacherAnalytics');if(!box)return;try{const r=await fetch('/api/teacher/analytics');const d=await r.json();if(!r.ok||!d.ok){box.textContent=d.error||'Could not load analytics.';return}box.innerHTML='<div class="analytics-metric"><b>'+d.total_attempts+'</b><small>Attempts</small></div><div class="analytics-metric"><b>'+d.accuracy+'%</b><small>Accuracy</small></div><div class="analytics-topics">'+(d.topics.length?d.topics.map(t=>'<div class="progress-item"><span>'+escapeHTML(t.topic)+' · '+t.attempts+' attempts</span><span>'+t.accuracy+'%</span></div>').join(''):'No student attempts yet.')+'</div>';const list=$('materialList');if(list)list.innerHTML=(d.materials||[]).map(m=>'<div class="material-row"><div><b>'+escapeHTML(m.filename)+'</b><small>'+escapeHTML(m.uploaded_by)+' · '+(m.approved?'Approved and used by tutor':'Draft · not used by tutor')+'</small></div><button type="button" class="secondary-button material-approval" data-material-id="'+m.id+'" data-approved="'+(!m.approved)+'">'+(m.approved?'Return to draft':'Approve')+'</button></div>').join('')||'<p class="muted-note">No materials uploaded yet.</p>';list.querySelectorAll('[data-material-id]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const rr=await fetch('/api/teacher/material/'+btn.dataset.materialId+'/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({approved:btn.dataset.approved==='true'})});const dd=await rr.json();if(!dd.ok)toast(dd.error||'Could not update approval');else{toast(dd.message);loadTeacherAnalytics()}}catch(e){toast('Could not update approval.')}finally{btn.disabled=false}})}catch(e){box.textContent='Analytics are temporarily unavailable.'}}
async function loadAdminRequests(){const card=$('adminRequestsCard'),list=$('adminRequestsList');if(!card||currentRole!=='admin')return;card.classList.remove('hidden');try{const r=await fetch('/api/admin/teacher-requests');const d=await r.json();if(!r.ok||!d.ok){list.textContent=d.error||'Could not load teacher requests.';return}list.innerHTML=(d.requests||[]).map(u=>'<div class="teacher-request-row"><div><b>'+escapeHTML(u.full_name)+'</b><small>@'+escapeHTML(u.username)+' · '+escapeHTML(u.email)+'</small></div><button class="secondary-button" data-approve-teacher="'+escapeHTML(u.username)+'">Approve</button></div>').join('')||'<p class="muted-note">No pending teacher requests.</p>';list.querySelectorAll('[data-approve-teacher]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const rr=await fetch('/api/admin/teacher-requests/'+encodeURIComponent(btn.dataset.approveTeacher)+'/approve',{method:'POST'});const dd=await rr.json();if(!dd.ok)toast(dd.error||'Approval failed.');else{toast(dd.message);loadAdminRequests()}}catch(e){toast('Could not approve teacher.')}finally{btn.disabled=false}})}catch(e){list.textContent='Could not load teacher requests.'}}
const uploadForm=$('materialUploadForm');if(uploadForm)uploadForm.addEventListener('submit',async e=>{e.preventDefault();const file=$('materialFile').files[0],msg=$('uploadMessage'),btn=$('uploadMaterialButton');if(!file)return;msg.className='connection-message';msg.textContent='Uploading and extracting text…';msg.classList.remove('hidden');btn.disabled=true;try{const form=new FormData();form.append('file',file);const r=await fetch('/api/teacher/upload',{method:'POST',body:form});const d=await r.json();msg.classList.add(d.ok?'success':'error');msg.textContent=d.ok?'✓ '+d.message:(d.error||'Upload failed.');if(d.ok){uploadForm.reset();loadTeacherAnalytics()}}catch(e){msg.classList.add('error');msg.textContent='Could not upload. Check the local server and try again.'}finally{btn.disabled=false}});


const codingChallenges={stack:{prompt:'Implement a Stack class with push(), pop(), and peek(). Handle an empty stack safely.',code:'class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, value):\n        self.items.append(value)\n\n    def pop(self):\n        if not self.items:\n            return None\n        return self.items.pop()\n\n    def peek(self):\n        return self.items[-1] if self.items else None'},queue:{prompt:'Implement a queue with enqueue() and dequeue(). Explain why collections.deque is suitable.',code:'from collections import deque\n\nclass Queue:\n    def __init__(self):\n        self.items = deque()\n\n    def enqueue(self, value):\n        self.items.append(value)\n\n    def dequeue(self):\n        return self.items.popleft() if self.items else None'},binarysearch:{prompt:'Write iterative binary search for a sorted list. Return the index or -1 if not found.',code:'def binary_search(items, target):\n    left, right = 0, len(items) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if items[mid] == target:\n            return mid\n        if items[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1'},linkedlist:{prompt:'Create a Node class and a minimal SinglyLinkedList append() operation.',code:'class Node:\n    def __init__(self, value):\n        self.value = value\n        self.next = None\n\nclass SinglyLinkedList:\n    def __init__(self):\n        self.head = None\n\n    def append(self, value):\n        node = Node(value)\n        if self.head is None:\n            self.head = node\n            return\n        current = self.head\n        while current.next is not None:\n            current = current.next\n        current.next = node'},bfs:{prompt:'Write BFS using an adjacency dictionary and a queue. Return the visit order.',code:'from collections import deque\n\ndef bfs(graph, start):\n    visited = {start}\n    order = []\n    queue = deque([start])\n    while queue:\n        node = queue.popleft()\n        order.append(node)\n        for neighbor in graph.get(node, []):\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    return order'},hashing:{prompt:'Write a function that counts how often each item appears in a list using a dictionary.',code:'def frequencies(items):\n    counts = {}\n    for item in items:\n        counts[item] = counts.get(item, 0) + 1\n    return counts'}};
function updateCodingChallenge(){const c=codingChallenges[$('codingChallenge').value];$('codingPrompt').textContent=c.prompt;$('sampleSolution').classList.add('hidden');$('sampleSolution').querySelector('code').textContent=c.code}
if($('codingChallenge')){$('codingChallenge').onchange=updateCodingChallenge;$('showSolution').onclick=()=>{$('sampleSolution').classList.remove('hidden');$('sampleSolution').querySelector('code').textContent=codingChallenges[$('codingChallenge').value].code};$('clearCode').onclick=()=>{$('codeEditor').value='';$('codeEditor').focus()};updateCodingChallenge()}

// Voice assistance: speech-to-text for prompts and text-to-speech for tutor answers.
(function setupVoice(){
 const mic=$('micButton'),input=$('messageInput'),status=$('voiceStatus');
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SpeechRecognition){mic.title='Voice input is unavailable in this browser';status.textContent='Voice input needs a browser with speech recognition (Chrome or Edge recommended). Read aloud still works where speech synthesis is supported.';mic.disabled=true;mic.classList.add('voice-unavailable');return}
 let recognition=null,listening=false;
 mic.onclick=()=>{if(listening){try{recognition.stop()}catch(e){}return}recognition=new SpeechRecognition();recognition.lang='en-IN';recognition.interimResults=true;recognition.continuous=false;recognition.onstart=()=>{listening=true;mic.classList.add('listening');mic.textContent='■';status.textContent='Listening… speak your question now.'};recognition.onresult=e=>{let transcript='';for(let i=e.resultIndex;i<e.results.length;i++)transcript+=e.results[i][0].transcript;input.value=transcript;input.dispatchEvent(new Event('input'));};recognition.onerror=e=>{status.textContent=e.error==='not-allowed'?'Microphone permission denied. Allow microphone access in your browser settings.':'Voice input error: '+e.error+'. You can type your question instead.'};recognition.onend=()=>{listening=false;mic.classList.remove('listening');mic.textContent='🎙';if(input.value.trim())status.textContent='Voice captured. Press Send to ask the tutor.';else if(status.textContent==='Listening… speak your question now.')status.textContent='No speech detected. Tap the microphone and try again.'};try{recognition.start()}catch(e){status.textContent='Could not start microphone. Check browser permission and try again.'}}
})();

// Role-based sign-in: student pages never expose provider credentials or AI configuration.
let selectedLoginRole='student';
document.querySelectorAll('[data-role-choice]').forEach(btn=>btn.addEventListener('click',()=>{
 selectedLoginRole=btn.dataset.roleChoice;
 document.querySelectorAll('[data-role-choice]').forEach(b=>b.classList.toggle('active',b===btn));
 $('loginTitle').textContent=selectedLoginRole==='teacher'?'Faculty sign in.':'Welcome back.';
 $('loginSubtitle').textContent=selectedLoginRole==='teacher'?'Sign in to manage the learning workspace and AI service.':'Sign in to continue your learning journey.';
 $('loginUsername').value=selectedLoginRole==='teacher'?'teacher':'student';$('loginPassword').value='';
 $('loginHelp').innerHTML=selectedLoginRole==='teacher'?'Teacher demo: <b>teacher</b> / <b>teacher123</b><br>Admin demo: <b>admin</b> / <b>admin123</b>':'Student demo: <b>student</b> / <b>student123</b>';
 $('loginError').classList.add('hidden');
}));
function showLoginForm(){ $('registerForm').classList.add('hidden');$('loginForm').classList.remove('hidden');document.querySelector('.role-switch').classList.remove('hidden');$('loginHelp').classList.remove('hidden');$('showRegister').classList.remove('hidden');$('loginTitle').textContent=selectedLoginRole==='teacher'?'Faculty sign in.':'Welcome back.';$('loginSubtitle').textContent=selectedLoginRole==='teacher'?'Sign in to manage the learning workspace and AI service.':'Sign in to continue your learning journey.'; }
$('showRegister').onclick=()=>{ $('registerForm').classList.remove('hidden');$('loginForm').classList.add('hidden');document.querySelector('.role-switch').classList.add('hidden');$('loginHelp').classList.add('hidden');$('showRegister').classList.add('hidden');$('loginTitle').textContent='Join the learning world.';$('loginSubtitle').textContent='Create an account to save your own learning progress.';$('registerError').classList.add('hidden');$('registerMessage').classList.add('hidden'); };
$('backToLogin').onclick=showLoginForm;
$('registerForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('registerSubmit'),err=$('registerError'),msg=$('registerMessage');err.classList.add('hidden');msg.classList.add('hidden');btn.disabled=true;btn.textContent='Creating account…';
 const payload={full_name:$('registerName').value.trim(),username:$('registerUsername').value.trim(),email:$('registerEmail').value.trim(),password:$('registerPassword').value,role:$('registerRole').value};
 try{const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!d.ok){err.textContent=d.error||'Could not create account.';err.classList.remove('hidden');return}if(d.pending){msg.textContent=d.message;msg.classList.remove('hidden');msg.classList.add('success');$('registerForm').reset();return}applyRole(d.role,d.display,d.ai_ready);toast(d.message||'Account created.');
 }catch(ex){err.textContent='Could not reach the local app server. Restart start_app.bat and try again.';err.classList.remove('hidden')}finally{btn.disabled=false;btn.innerHTML='Create account <span>→</span>'}
});
function applyRole(role,display,aiReady){
 currentRole=role;$('loginScreen').classList.add('hidden');$('appShell').classList.remove('hidden');
 const teacher=['teacher','admin'].includes(role);$('openSettings').classList.toggle('hidden',!teacher);$('teacherNav').classList.toggle('hidden',!teacher);
 $('profileAvatar').textContent=role==='admin'?'A':(teacher?'T':'S');$('topAvatar').textContent=role==='admin'?'A':(teacher?'T':'S');$('profileName').textContent=(display||role)+' workspace';$('profileRole').textContent=role==='admin'?'Administrator access':(teacher?'Faculty access':'Personal learning');$('topRoleBadge').textContent=role==='admin'?'ADMIN':(teacher?'FACULTY':'STUDENT');
 $('connectionCard').classList.toggle('teacher-connection-card',teacher);$('connectionHelp').textContent=aiReady?'AI tutor is ready to use.':(teacher?'Configure Groq to enable tutoring.':'AI service is not configured yet.');
 setConnected(!!aiReady);if(teacher&&$('teacherAIStatus'))$('teacherAIStatus').textContent=aiReady?'Connected':'Not connected';
 document.body.classList.toggle('teacher-mode',teacher);showPage(teacher?'teacher':'tutor');loadPersistedProgress();if(teacher)loadTeacherAnalytics();if(role==='admin'){ $('adminRequestsCard').classList.remove('hidden');loadAdminRequests(); }else if($('adminRequestsCard'))$('adminRequestsCard').classList.add('hidden');
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();const err=$('loginError'),submit=$('loginSubmit');err.classList.add('hidden');submit.disabled=true;submit.textContent='Signing in…';
 try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('loginUsername').value.trim(),password:$('loginPassword').value})});const d=await r.json();if(!d.ok){err.textContent=d.error||'Sign-in failed.';err.classList.remove('hidden');return}if(selectedLoginRole==='teacher'&&!['teacher','admin'].includes(d.role)){await fetch('/api/logout',{method:'POST'});err.textContent='Use a teacher account for the faculty workspace.';err.classList.remove('hidden');return}if(selectedLoginRole==='student'&&d.role!=='student'){await fetch('/api/logout',{method:'POST'});err.textContent='Use a student account for the student workspace.';err.classList.remove('hidden');return}applyRole(d.role,d.display,d.ai_ready)}catch(ex){err.textContent='Could not reach the local app server. Restart start_app.bat and try again.';err.classList.remove('hidden')}finally{submit.disabled=false;submit.innerHTML='Sign in <span>→</span>'}
});
$('logoutButton').addEventListener('click',async()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();try{await fetch('/api/logout',{method:'POST'})}catch(e){}currentRole=null;apiKey='';$('apiKey').value='';$('settingsModal').classList.add('hidden');$('appShell').classList.add('hidden');$('loginScreen').classList.remove('hidden');$('loginPassword').value='';history=[];});
(async()=>{try{const r=await fetch('/api/session');const d=await r.json();if(d.authenticated)applyRole(d.role,d.display,d.ai_ready)}catch(e){}})();
$('conceptGrid').innerHTML=concepts.map((c,i)=>'<div class="concept-tile"><span>'+['▦','↕','⇢','⌁','⟳','↔','⌂','⌘','△','⌕'][i]+'</span><b>'+c+'</b></div>').join('');renderModel();loadQuestion();
