const uuidv4__ = () => {

  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function formattedDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = String(today.getFullYear());

  const formattedDate = day + month + year;

  return formattedDate
}

module.exports =  formattedDate 
module.exports = { uuidv4__ }
