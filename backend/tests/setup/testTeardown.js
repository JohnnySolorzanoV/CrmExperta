import { cerrarPoolPruebas } from '../helpers/dbTestUtils.js'

export default async function teardown() {
  await cerrarPoolPruebas()
}
