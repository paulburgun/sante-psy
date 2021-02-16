module.exports.isValidDate = (isoDateString) => {
  if (!isoDateString || isoDateString.length === 0) {
    return false
  }
  return !isNaN(new Date(Date.parse(isoDateString)))
}