
const form=document.getElementById('bookForm');
const titleInput=document.getElementById('title');
const authorInput=document.getElementById('author');
const yearInput=document.getElementById('year');
const copiesInput=document.getElementById('copies');
const listDiv=document.getElementById('list');
const summaryDiv=document.getElementById('summary');
const searchInput=document.getElementById('liveSearch');
const filterSelect=document.getElementById('filterSelect');
const bookSelect=document.getElementById('bookSelect');
const returnSelect=document.getElementById('returnSelect');

class Book {
  constructor(title,author,year,copies){
    this.title=title;this.author=author;this.year=year;
    this.copies=parseInt(copies);this.borrowedBy=[];
  }
}
class Borrower {
  constructor(name,id){this.name=name;this.id=id;this.borrowed=[];}
}


let books=[]; 
let borrowers=[];
let cardView=false;

Borrower.prototype.borrow = function(book){
  if(!book || book.copies <= 0){ alert('Not available'); return; }
  if(this.borrowed.some(b=>b.title === book.title)){ alert('You already borrowed this book'); return; }
  book.copies--;
  this.borrowed.push({ title: book.title });
  book.borrowedBy.push({ id: this.id, name: this.name });
  console.log(`${this.name} (${this.id}) borrowed "${book.title}"`);
  render(); refreshReturnSelect(this);
};
Borrower.prototype.returnBook = function(title){
  const idx = this.borrowed.findIndex(b => b.title === title);
  if(idx === -1){ alert('Not borrowed'); return; }
  this.borrowed.splice(idx,1);
  const book = books.find(b => b.title === title);
  if(book){
    book.copies++;
    book.borrowedBy = book.borrowedBy.filter(entry => entry.id !== this.id);
  }
  console.log(`${this.name} (${this.id}) returned "${title}"`);
  render(); refreshReturnSelect(this);
};

Borrower.prototype.report = function(){
  if(this.borrowed.length === 0) return `${this.name} (${this.id}) has no borrowed books.`;
  const titles = this.borrowed.map(b => b.title).join(', ');
  return `${this.name} (${this.id}) has borrowed: ${titles}.`;
};

form.addEventListener('submit', e => {
  e.preventDefault();
  const t = titleInput.value.trim();
  const a = authorInput.value.trim();
  const y = +yearInput.value;
  const c = +copiesInput.value;
  if(!t || !a || !y || c < 0){ alert('Please fill valid inputs'); return; }
  let book = books.find(b => b.title === t);
  if(book){ book.author = a; book.year = y; book.copies = c; console.log(`Updated book: ${t}`); }
  else { books.push(new Book(t,a,y,c)); console.log(`Added book: ${t}`); }
  form.reset(); render();
});

document.getElementById('resetBtn').addEventListener('click',()=>form.reset());
document.getElementById('filterBtn').addEventListener('click',render);
const sortState = { field: null, dir: 'asc' };
document.querySelectorAll('.sortBtn').forEach(btn=>
  btn.addEventListener('click',()=>{
    const field = btn.dataset.field;
    if(sortState.field === field){
      sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    } else { sortState.field = field; sortState.dir = 'asc'; }
    books.sort((a,b)=>{
      if(a[field] === b[field]) return 0;
      return (a[field] > b[field] ? 1 : -1) * (sortState.dir === 'asc' ? 1 : -1);
    });
    console.log(`Sorted by ${field} (${sortState.dir})`);
    render();
  })
);
document.getElementById('toggleView').addEventListener('click',()=>{cardView=!cardView;render();});


searchInput.addEventListener('input', render);

function render(){
  const search = searchInput.value.toLowerCase();
  const filter = filterSelect.value;
  let filtered = books.filter(b =>
    b.title.toLowerCase().includes(search) ||
    b.author.toLowerCase().includes(search)
  );
  if(filter === 'after2015') filtered = filtered.filter(b => b.year > 2015);
  if(filter === 'zero') filtered = filtered.filter(b => b.copies === 0);
  if(filter === 'available') filtered = filtered.filter(b => b.copies > 0);

  if(cardView){
    listDiv.innerHTML = filtered.map(b =>
      `<div style="border:1px solid #ccc;padding:8px;margin:4px;background:${b.copies===0?'#ffeeee':'#fff'}">
         <b>${b.title}</b> by ${b.author} (${b.year}) Copies:${b.copies}
         <div>Borrowed by: ${b.borrowedBy.map(x=>x.name).join(', ') || 'None'}</div>
         <button onclick="deleteBook('${b.title}')">Delete</button>
       </div>`
    ).join('');
  } else {
    let html = "<table border='1' cellpadding='5'><tr><th>Title</th><th>Author</th><th>Year</th><th>Copies</th><th>Borrowed By</th><th>Action</th></tr>";
    filtered.forEach(b => {
      html += `<tr style="color:${b.copies===0?'red':'inherit'}">
               <td>${b.title}</td>
               <td>${b.author}</td>
               <td>${b.year}</td>
               <td>${b.copies}</td>
               <td>${b.borrowedBy.map(x=>x.name).join(', ') || ''}</td>
               <td><button onclick="deleteBook('${b.title}')">Delete</button></td>
             </tr>`;
    });
    html += "</table>";
    listDiv.innerHTML = html;
  }

  const borrowedCount = books.reduce((acc,b)=>acc + b.borrowedBy.length,0);
  summaryDiv.innerText = `Total books: ${books.length} | Borrowed entries: ${borrowedCount}`;
  bookSelect.innerHTML = books.map(b => `<option>${b.title}</option>`).join('');
  console.log(`Rendered ${filtered.length} visible / ${books.length} total books, ${borrowedCount} borrowed entries`);
} 

function deleteBook(title){
  const book = books.find(b => b.title === title);
  if(book && book.borrowedBy && book.borrowedBy.length > 0){
    const borrowersList = book.borrowedBy.map(b=>b.name).join(', ');
    console.log(`Delete prevented: ${title} currently borrowed by: ${borrowersList}`);
    alert('Cannot delete a book that is currently borrowed.');
    return;
  }
  if(confirm(`Are you sure you want to delete "${title}"?`)){
    books = books.filter(b => b.title !== title);
    console.log(`Deleted book: ${title}`);
    render();
  }
} 

document.getElementById('borrowBtn').addEventListener('click', ()=>{
  const name = document.getElementById('borrowerName').value.trim();
  const id = document.getElementById('borrowerId').value.trim();
  const t = bookSelect.value;
  if(!name || !id){ alert('Please enter borrower name and id'); return; }
  if(!t){ alert('No book selected'); return; }
  const b = findOrCreateBorrower(name,id);
  const bk = books.find(x => x.title === t);
  if(!bk){ alert('Selected book not found'); return; }
  b.borrow(bk);
  console.log(`Borrow action: ${b.name} borrowed ${t}`);
  summaryDiv.innerText = b.report() + '\n' + summaryDiv.innerText;
});
document.getElementById('returnBtn').addEventListener('click', ()=>{
  const name = document.getElementById('borrowerName').value.trim();
  const id = document.getElementById('borrowerId').value.trim();
  if(!name || !id){ alert('Please enter borrower name and id'); return; }
  const b = borrowers.find(x => x.id === id);
  if(!b){ alert('No borrower found with that ID'); return; }
  const t = returnSelect.value;
  if(!t || b.borrowed.length === 0){ alert('No borrowed book selected'); return; }
  b.returnBook(t);
  console.log(`Return action: ${b.name} returned ${t}`);
  summaryDiv.innerText = b.report() + '\n' + summaryDiv.innerText;
});

function findOrCreateBorrower(name,id){
  let b = borrowers.find(x => x.id === id);
  if(!b){ b = new Borrower(name,id); borrowers.push(b); console.log(`Created borrower: ${name} (${id})`); }
  else { if(name && b.name !== name){ b.name = name; } }
  return b;
}
function refreshReturnSelect(borrower){
  if(!borrower){returnSelect.innerHTML="";return;}
  if(borrower.borrowed.length===0){
    returnSelect.innerHTML="<option disabled>No borrowed books</option>";
    return;
  }
  returnSelect.innerHTML=borrower.borrowed.map(b=>`<option>${b.title}</option>`).join('');
}

render();
console.log(`App initialized. Books: ${books.length}`);
